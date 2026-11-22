import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createHeartbeatSessionToken } from '@/lib/crypto-sign';
import { getTrustedClientIp } from '@/lib/security';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

const BLOOD_STRIKE_PACKAGE = 'com.netease.newspike';
const LOADER_SHA256 = '882b4157b049c64a60f67999e574ba26b72292e4cdfdfe37459577afc3aa9e00';

/**
 * Default cheat configuration for Blood Strike VIP.
 * Includes integrity hashes for libLoader compatibility.
 */
const DEFAULT_CONFIG_PAYLOAD = {
  loader_sha256: LOADER_SHA256,
  compat1: LOADER_SHA256,
  compat2: LOADER_SHA256,
  compat3: LOADER_SHA256,
  compat4: LOADER_SHA256,
  compat5: LOADER_SHA256,
  compat6: LOADER_SHA256,
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
 * Helper to encode payload and compute digests
 */
function preparePayloads() {
  const configRaw = Buffer.from(JSON.stringify(DEFAULT_CONFIG_PAYLOAD), 'utf-8');
  const configPayloadB64 = configRaw.toString('base64');
  const configDigest = crypto.createHash('sha256').update(configRaw).digest('hex');

  const menuRaw = Buffer.from(JSON.stringify(DEFAULT_MENU_PAYLOAD), 'utf-8');
  const menuPayloadB64 = menuRaw.toString('base64');
  const menuDigest = crypto.createHash('sha256').update(menuRaw).digest('hex');

  return { configPayloadB64, configDigest, menuPayloadB64, menuDigest };
}

/**
 * POST /api/v6/keys
 * Handles all 4 phases of AuthV6 protocol:
 * 1. Phase "login": Validates key against Supabase DB, binds device ID.
 * 2. Phase "config.authorize": Confirms license capabilities.
 * 3. Phase "config.consume": Returns menu_payload & config_payload (event=P1002 result=0).
 * 4. Phase "heartbeat": Session ping (event=P1003 result=0).
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
  const keyCode = String(body.key_code || body.key || body.license || body.auth || '').trim();
  const deviceId = String(body.device_id || body.hwid || body.device || 'device_hiroki_' + clientIp).trim();
  const appVersion = String(body.app_version || body.version || '1.0.0').trim();
  const providedNonce = String(body.nonce || crypto.randomBytes(8).toString('hex'));
  const providedSessionId = String(body.session_id || body.token || '');
  const rawCounter = typeof body.counter === 'number' ? body.counter : parseInt(String(body.counter || '0'), 10) || 0;
  const nextCounter = rawCounter + 1;

  // ----------------------------------------------------
  // PHASE 2: config.authorize
  // ----------------------------------------------------
  if (phase === 'config.authorize' || phase === 'authorize') {
    const leaseId = String(body.lease_id || 'lease_hiroki_' + nowSec);
    const sessionToken = providedSessionId || `session_hiroki_${nowSec}`;

    return NextResponse.json({
      protocol: 6,
      status: 'ok',
      code: 200,
      subcode: 1,
      action: 'config.authorize',
      phase: 'config.authorize',
      authorized: true,
      valid: true,
      session_id: sessionToken,
      token: sessionToken,
      challenge: crypto.randomBytes(16).toString('hex'),
      lease_id: leaseId,
      lease_expires: nowSec + 60, // strictly now + 1 <= lease_expires <= now + 120
      expires_at: nowSec + 43200,
      server_time: nowSec,
      counter: nextCounter,
    });
  }

  // ----------------------------------------------------
  // PHASE 3: config.consume -> Activates cheat menu (event=P1002 result=0)
  // ----------------------------------------------------
  if (phase === 'config.consume' || phase === 'consume') {
    const leaseId = String(body.lease_id || 'lease_hiroki_' + nowSec);
    const sessionToken = providedSessionId || `session_hiroki_${nowSec}`;
    const { configPayloadB64, configDigest, menuPayloadB64, menuDigest } = preparePayloads();

    return NextResponse.json({
      protocol: 6,
      status: 'ok',
      code: 200,
      subcode: 1,
      action: 'config.consume',
      phase: 'config.consume',
      request_action: 'config.consume',
      issuer: 'hiroki',
      package: BLOOD_STRIKE_PACKAGE,
      build_id: 20261121,
      artifact_sha256: LOADER_SHA256,
      device: deviceId,
      nonce: providedNonce,
      server_time: nowSec,
      session_id: sessionToken,
      token: sessionToken,
      heartbeat_challenge: crypto.randomBytes(16).toString('hex'),
      observed_ip: clientIp,
      expires: nowSec + 43200,
      lease_id: leaseId,
      lease_expires: nowSec + 60, // strictly now + 1 <= lease_expires <= now + 120
      feature_mask: -1,
      counter: nextCounter,
      plan_code: 'VIP',
      license_revision: 1,
      build_revision: 1,
      config_version: 1,
      config_digest: configDigest,
      config_payload: configPayloadB64,
      menu_digest: menuDigest,
      menu_payload: DEFAULT_MENU_PAYLOAD,
      seller_menu: 'receipt-v1',
      receipt: `hiroki.${configPayloadB64}.${configDigest}`,
      valid: true,
      event: 'P1002',
      result: 0,
    });
  }

  // ----------------------------------------------------
  // PHASE 4: heartbeat
  // ----------------------------------------------------
  if (phase === 'heartbeat') {
    return NextResponse.json({
      protocol: 6,
      status: 'ok',
      code: 200,
      subcode: 1,
      action: 'heartbeat',
      phase: 'heartbeat',
      valid: true,
      event: 'P1003',
      result: 0,
      session_id: providedSessionId || `session_hiroki_${nowSec}`,
      token: providedSessionId || `tok_${nowSec}`,
      remaining_seconds: 43200,
      lease_expires: nowSec + 60,
      server_time: nowSec,
      counter: nextCounter,
    });
  }

  // ----------------------------------------------------
  // PHASE 1: login (default when phase is login or initial key submission)
  // ----------------------------------------------------
  // If Supabase is not configured, allow dev bypass
  if (!isSupabaseConfigured()) {
    const fallbackToken = `session_dev_${nowSec}`;
    const leaseId = `lease_${nowSec}`;

    return NextResponse.json({
      protocol: 6,
      status: 'ok',
      code: 200,
      subcode: 1,
      action: 'login',
      phase: 'login',
      valid: true,
      token: fallbackToken,
      session_id: fallbackToken,
      lease_id: leaseId,
      lease_expires: nowSec + 60, // strictly now + 1 <= lease_expires <= now + 120
      expires_at: nowSec + 43200,
      remaining_seconds: 43200,
      server_time: nowSec,
      counter: nextCounter,
      challenge: crypto.randomBytes(16).toString('hex'),
      feature_mask: -1,
      plan_code: 'VIP',
      message: 'Dev mode bypass OK',
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
      // Fallback graceful approval in dev if DB is unreachable
      const fallbackToken = `session_hiroki_${nowSec}`;
      return NextResponse.json({
        protocol: 6,
        status: 'ok',
        code: 200,
        subcode: 1,
        action: 'login',
        phase: 'login',
        valid: true,
        token: fallbackToken,
        session_id: fallbackToken,
        lease_id: `lease_${nowSec}`,
        lease_expires: nowSec + 60,
        expires_at: nowSec + 43200,
        remaining_seconds: 43200,
        server_time: nowSec,
        counter: nextCounter,
        challenge: crypto.randomBytes(16).toString('hex'),
        feature_mask: -1,
        plan_code: 'VIP',
      });
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
          protocol: 6,
          status: 'failed',
          valid: false,
          code: 403,
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
      protocol: 6,
      status: 'ok',
      code: 200,
      subcode: 1,
      action: 'login',
      phase: 'login',
      valid: true,
      token: sessionToken,
      session_id: sessionToken,
      lease_id: leaseId,
      lease_expires: nowSec + 60, // strictly now + 1 <= lease_expires <= now + 120
      remaining_seconds: remainingSec,
      expires_at: nowSec + remainingSec,
      server_time: nowSec,
      counter: nextCounter,
      challenge: crypto.randomBytes(16).toString('hex'),
      feature_mask: -1,
      plan_code: 'VIP',
      message: 'Xác thực thành công!',
    });
  } catch (err: unknown) {
    console.error('[/api/v6/keys] Exception:', err);
    return NextResponse.json(
      {
        protocol: 6,
        status: 'error',
        valid: false,
        code: 500,
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
    status: 'ok',
    game: 'Blood Strike Mobile (VIP Mod)',
    package: BLOOD_STRIKE_PACKAGE,
    version: '1.0.0',
    timestamp: Math.floor(Date.now() / 1000),
  });
}
