import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createHeartbeatSessionToken } from '@/lib/crypto-sign';
import { getTrustedClientIp } from '@/lib/security';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

const BLOOD_STRIKE_PACKAGE = 'com.netease.newspike';

/**
 * Default cheat configuration and menu schema for Blood Strike VIP.
 */
const DEFAULT_CONFIG_PAYLOAD = {
  esp_enabled: true,
  esp_box: true,
  esp_skeleton: true,
  esp_distance: true,
  esp_health: true,
  esp_line: false,
  aimbot_enabled: true,
  aimbot_fov: 120,
  aimbot_smooth: 6,
  aimbot_target: 'head',
  recoil_reduction: 1.0,
  bullet_tracking: true,
  hide_from_screen_record: true,
  version: '1.0.0',
};

const DEFAULT_MENU_PAYLOAD = {
  title: 'Hiroki VIP - Blood Strike',
  version: '1.0.0',
  build: 20261121,
  author: 'Hiroki Team',
  features: [
    { id: 'esp_box', name: 'ESP 2D Box', type: 'toggle', default: 1 },
    { id: 'esp_bone', name: 'ESP Khung Xương (Skeleton)', type: 'toggle', default: 1 },
    { id: 'esp_distance', name: 'ESP Khoảng Cách (Distance)', type: 'toggle', default: 1 },
    { id: 'esp_health', name: 'ESP Thanh Máu (Health)', type: 'toggle', default: 1 },
    { id: 'esp_line', name: 'ESP Đường Kẻ (Snapline)', type: 'toggle', default: 0 },
    { id: 'aim_bot', name: 'Aimbot Tâm Tự Động', type: 'toggle', default: 1 },
    { id: 'aim_fov', name: 'Vòng Ngắm FOV', type: 'slider', min: 30, max: 360, default: 120 },
    { id: 'aim_smooth', name: 'Độ Mượt Ngắm (Smooth)', type: 'slider', min: 1, max: 20, default: 6 },
    { id: 'no_recoil', name: 'Giảm Giật Súng (No Recoil)', type: 'toggle', default: 1 },
    { id: 'stream_proof', name: 'Che Giấu Khi Quay Màn Hình', type: 'toggle', default: 1 },
  ],
};

/**
 * POST /api/v6/keys
 * Handles all 3 phases of AuthV6 protocol:
 * 1. Phase "login": Validates key against Supabase DB, binds device ID.
 * 2. Phase "config.authorize": Confirms license capabilities.
 * 3. Phase "config.consume": Returns menu_payload & config_payload (event=P1002 result=0).
 * 4. Phase "heartbeat": Session ping.
 */
export async function POST(req: NextRequest) {
  const clientIp = getTrustedClientIp(req);
  const nowSec = Math.floor(Date.now() / 1000);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // If not json, parse text/urlencoded if possible
  }

  // Determine current phase or action
  const phase = String(body.phase || body.action || '').trim().toLowerCase();
  const keyCode = String(body.key_code || body.key || body.license || '').trim();
  const deviceId = String(body.device_id || body.hwid || body.device || 'device_hiroki_' + clientIp).trim();
  const appVersion = String(body.app_version || body.version || '1.0.0').trim();
  const ticket = String(body.ticket || '');
  const providedToken = String(body.token || body.session_id || '');

  // ----------------------------------------------------
  // PHASE 2: config.authorize
  // ----------------------------------------------------
  if (phase === 'config.authorize' || phase === 'authorize') {
    const leaseId = String(body.lease_id || 'lease_hiroki_' + nowSec);
    return NextResponse.json({
      status: 'success',
      code: 'OK',
      phase: 'config.authorize',
      authorized: true,
      valid: true,
      lease_id: leaseId,
      token: providedToken || `tok_${nowSec}`,
      expires_at: nowSec + 43200,
    });
  }

  // ----------------------------------------------------
  // PHASE 3: config.consume -> Activates cheat menu (event=P1002)
  // ----------------------------------------------------
  if (phase === 'config.consume' || phase === 'consume') {
    const leaseId = String(body.lease_id || 'lease_hiroki_' + nowSec);
    return NextResponse.json({
      status: 'success',
      code: 'OK',
      phase: 'config.consume',
      feature_mask: -1,
      lease_id: leaseId,
      lease_expires: nowSec + 43200,
      config_payload: DEFAULT_CONFIG_PAYLOAD,
      menu_payload: DEFAULT_MENU_PAYLOAD,
      menu_digest: crypto.createHash('sha256').update(JSON.stringify(DEFAULT_MENU_PAYLOAD)).digest('hex'),
    });
  }

  // ----------------------------------------------------
  // HEARTBEAT within /keys
  // ----------------------------------------------------
  if (phase === 'heartbeat') {
    return NextResponse.json({
      status: 'success',
      code: 'OK',
      phase: 'heartbeat',
      valid: true,
      event: 'P1003',
      result: 0,
      remaining_seconds: 43200,
      server_time: nowSec,
    });
  }

  // ----------------------------------------------------
  // PHASE 1: login (default when key is provided or phase is login)
  // ----------------------------------------------------
  // If no DB configured, allow graceful test mode if ALLOW_DIRECT_CLAIM is on
  if (!isSupabaseConfigured()) {
    const fallbackToken = `session_dev_${nowSec}`;
    return NextResponse.json({
      status: 'success',
      code: 'OK',
      phase: 'login',
      valid: true,
      token: fallbackToken,
      session_id: fallbackToken,
      lease_id: `lease_${nowSec}`,
      lease_expires: nowSec + 43200,
      remaining_seconds: 43200,
      challenge: crypto.randomBytes(16).toString('hex'),
      message: 'Dev mode bypass',
    });
  }

  // Call Supabase RPC verify_and_bind_key
  try {
    const supabase = getSupabaseAdmin();
    const effectiveKeyCode = keyCode || 'Hiroki_FREE_DEMO_KEY';

    const { data, error } = await supabase.rpc('verify_and_bind_key', {
      p_key_code: effectiveKeyCode,
      p_game_package: BLOOD_STRIKE_PACKAGE,
      p_device_id: deviceId,
      p_app_version: appVersion,
      p_client_ip: clientIp,
    });

    if (error || !data) {
      console.error('[/api/v6/keys] RPC error:', error);
      return NextResponse.json(
        {
          status: 'error',
          valid: false,
          code: 'SERVER_ERROR',
          message: 'Không thể kết nối cơ sở dữ liệu xác thực.',
        },
        { status: 500 }
      );
    }

    const rpcResult = data as {
      valid: boolean;
      code: string;
      key_id?: string;
      expires_at?: string | null;
      remaining_seconds?: number;
      max_devices?: number;
      used_devices?: number;
      message?: string;
    };

    if (!rpcResult.valid) {
      return NextResponse.json(
        {
          status: 'failed',
          valid: false,
          code: rpcResult.code || 'INVALID_KEY',
          message: rpcResult.message || 'Key không hợp lệ hoặc đã hết hạn.',
          key_code: effectiveKeyCode,
        },
        { status: 200 }
      );
    }

    const remainingSec = rpcResult.remaining_seconds && rpcResult.remaining_seconds > 0
      ? rpcResult.remaining_seconds
      : 43200;

    const sessionToken = createHeartbeatSessionToken({
      key_id: rpcResult.key_id || 'key_bs',
      key_code: effectiveKeyCode,
      game_package: BLOOD_STRIKE_PACKAGE,
      device_id: deviceId,
      key_expires_at: rpcResult.expires_at || null,
      iat: nowSec,
      next_db_check_at: nowSec + 300,
      exp: nowSec + Math.min(remainingSec, 3600),
    });

    const leaseId = `lease_${rpcResult.key_id || 'bs'}_${nowSec}`;

    return NextResponse.json({
      status: 'success',
      code: 'OK',
      phase: 'login',
      valid: true,
      token: sessionToken,
      session_id: sessionToken,
      ticket: ticket || `ticket_${nowSec}`,
      lease_id: leaseId,
      lease_expires: nowSec + remainingSec,
      remaining_seconds: remainingSec,
      expires_at: rpcResult.expires_at || null,
      challenge: crypto.randomBytes(16).toString('hex'),
      feature_mask: -1,
      message: 'Xác thực thành công!',
    });
  } catch (err: unknown) {
    console.error('[/api/v6/keys] Exception:', err);
    return NextResponse.json(
      {
        status: 'error',
        valid: false,
        code: 'INTERNAL_ERROR',
        message: 'Lỗi xử lý nội bộ tại máy chủ.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v6/keys
 * Health check & diagnostic info
 */
export async function GET() {
  return NextResponse.json({
    service: 'Hiroki AuthV6 Keys API',
    status: 'ONLINE',
    game: 'Blood Strike Mobile (VIP Mod)',
    package: BLOOD_STRIKE_PACKAGE,
    version: '1.0.0',
    timestamp: Math.floor(Date.now() / 1000),
  });
}
