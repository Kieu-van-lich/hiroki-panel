import { NextRequest, NextResponse } from 'next/server';
import {
  createHeartbeatSessionToken,
  signLicensePayload,
} from '@/lib/crypto-sign';
import {
  checkRateLimit,
  getTrustedClientIp,
  INPUT_PATTERNS,
} from '@/lib/security';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Helper to return an Ed25519-signed response envelope from `/api/v1/verify`.
 */
function buildSignedVerifyResponse(
  payload: {
    valid: boolean;
    code: string;
    key_code: string;
    game_package: string;
    device_id: string;
    nonce: string;
    iat: number;
    ttl_seconds: number;
    remaining_seconds: number;
    expires_at?: string | null;
    max_devices?: number;
    used_devices?: number;
    session_token?: string;
    message?: string;
    download_url?: string;
    min_version?: string;
  },
  httpStatus = 200
) {
  const signed = signLicensePayload(payload);
  return NextResponse.json(signed, { status: httpStatus });
}

/**
 * POST /api/v1/verify
 * Game Client endpoint for verifying a license key and atomically binding `device_id` (HWID)
 * to that specific game (`key_devices` via `verify_and_bind_key` RPC).
 */
export async function POST(req: NextRequest) {
  const clientIp = getTrustedClientIp(req);
  const nowSec = Math.floor(Date.now() / 1000);

  let body: {
    key_code?: string;
    game_package?: string;
    device_id?: string;
    device_name?: string;
    app_version?: string;
    nonce?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'INVALID_JSON', message: 'Invalid JSON request body' },
      { status: 400 }
    );
  }

  const keyCode = (body.key_code || '').trim();
  const gamePackage = (body.game_package || '').trim();
  const deviceId = (body.device_id || '').trim();
  const deviceName = (body.device_name || 'Android Device').trim().slice(0, 100);
  const appVersion = (body.app_version || '1.0.0').trim();
  const nonce = (body.nonce || '00000000').trim();

  // Validate inputs early before hitting DB
  if (
    !INPUT_PATTERNS.KEY_CODE.test(keyCode) ||
    !INPUT_PATTERNS.GAME_PACKAGE.test(gamePackage) ||
    !INPUT_PATTERNS.DEVICE_ID.test(deviceId) ||
    !INPUT_PATTERNS.APP_VERSION.test(appVersion) ||
    !INPUT_PATTERNS.NONCE.test(nonce)
  ) {
    return buildSignedVerifyResponse(
      {
        valid: false,
        code: 'INVALID_INPUT',
        key_code: keyCode.slice(0, 80),
        game_package: gamePackage.slice(0, 120),
        device_id: deviceId.slice(0, 128),
        nonce: nonce.slice(0, 64),
        iat: nowSec,
        ttl_seconds: 0,
        remaining_seconds: 0,
        message: 'Định dạng tham số xác thực không hợp lệ.',
      },
      400
    );
  }

  // Rate limit per IP (max 30 verify calls / minute) & per IP+Key (max 15 / minute)
  const [ipAllowed, keyAllowed] = await Promise.all([
    checkRateLimit('verify_ip', clientIp, 60, 30),
    checkRateLimit('verify_ip_key', `${clientIp}:${keyCode}`, 60, 15),
  ]);

  if (!ipAllowed || !keyAllowed) {
    return buildSignedVerifyResponse(
      {
        valid: false,
        code: 'RATE_LIMITED',
        key_code: keyCode,
        game_package: gamePackage,
        device_id: deviceId,
        nonce,
        iat: nowSec,
        ttl_seconds: 0,
        remaining_seconds: 0,
        message: 'Quá nhiều lần thử xác thực. Vui lòng thử lại sau 1 phút.',
      },
      429
    );
  }

  if (!isSupabaseConfigured()) {
    return buildSignedVerifyResponse(
      {
        valid: false,
        code: 'SERVER_UNCONFIGURED',
        key_code: keyCode,
        game_package: gamePackage,
        device_id: deviceId,
        nonce,
        iat: nowSec,
        ttl_seconds: 0,
        remaining_seconds: 0,
        message: 'Máy chủ chưa cấu hình kết nối cơ sở dữ liệu.',
      },
      503
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('verify_and_bind_key', {
      p_key_code: keyCode,
      p_game_package: gamePackage,
      p_device_id: deviceId,
      p_app_version: appVersion,
      p_client_ip: clientIp,
    });

    if (error || !data) {
      console.error('[/api/v1/verify] RPC error:', error);
      return buildSignedVerifyResponse(
        {
          valid: false,
          code: 'SERVER_ERROR',
          key_code: keyCode,
          game_package: gamePackage,
          device_id: deviceId,
          nonce,
          iat: nowSec,
          ttl_seconds: 0,
          remaining_seconds: 0,
          message: 'Lỗi kết nối máy chủ xác thực.',
        },
        500
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
      min_version?: string;
      download_url?: string;
    };

    if (!rpcResult.valid) {
      return buildSignedVerifyResponse(
        {
          valid: false,
          code: rpcResult.code || 'VERIFY_FAILED',
          key_code: keyCode,
          game_package: gamePackage,
          device_id: deviceId,
          nonce,
          iat: nowSec,
          ttl_seconds: 0,
          remaining_seconds: 0,
          message: rpcResult.message,
          min_version: rpcResult.min_version,
          download_url: rpcResult.download_url,
        },
        200
      );
    }

    const remainingSeconds =
      typeof rpcResult.remaining_seconds === 'number' ? rpcResult.remaining_seconds : -1;
    const ttlSeconds =
      remainingSeconds >= 0 ? Math.min(180, remainingSeconds) : 180;

    // Mint a 5-minute DB-recheck session token for `/api/v1/heartbeat`
    const sessionToken = createHeartbeatSessionToken({
      key_id: String(rpcResult.key_id || ''),
      key_code: keyCode,
      game_package: gamePackage,
      device_id: deviceId,
      key_expires_at: rpcResult.expires_at ?? null,
      iat: nowSec,
      next_db_check_at: nowSec + 300, // Re-query Postgres every 5 minutes
      exp: nowSec + 360, // Hard token expiry 6 minutes
    });

    return buildSignedVerifyResponse(
      {
        valid: true,
        code: 'OK',
        key_code: keyCode,
        game_package: gamePackage,
        device_id: deviceId,
        nonce,
        iat: nowSec,
        ttl_seconds: ttlSeconds,
        remaining_seconds: remainingSeconds,
        expires_at: rpcResult.expires_at ?? null,
        max_devices: rpcResult.max_devices ?? 1,
        used_devices: rpcResult.used_devices ?? 1,
        session_token: sessionToken,
      },
      200
    );
  } catch (err) {
    console.error('[/api/v1/verify] Exception:', err);
    return buildSignedVerifyResponse(
      {
        valid: false,
        code: 'SERVER_ERROR',
        key_code: keyCode,
        game_package: gamePackage,
        device_id: deviceId,
        nonce,
        iat: nowSec,
        ttl_seconds: 0,
        remaining_seconds: 0,
      },
      500
    );
  }
}

