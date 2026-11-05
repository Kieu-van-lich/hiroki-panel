import { NextRequest, NextResponse } from 'next/server';
import {
  createHeartbeatSessionToken,
  signLicensePayload,
  verifyHeartbeatSessionToken,
} from '@/lib/crypto-sign';
import {
  checkRateLimit,
  getTrustedClientIp,
  INPUT_PATTERNS,
} from '@/lib/security';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

/**
 * POST /api/v1/heartbeat
 * Called every 3 minutes by the in-game client.
 * - Verifies `session_token` Ed25519 signature first (zero DB load if `now < next_db_check_at` and key not expired).
 * - Every 5 minutes (`now >= next_db_check_at`), re-runs `verify_and_bind_key` RPC to ensure the key was not
 *   revoked/deleted, device was not unlinked, and game was not put into maintenance.
 */
export async function POST(req: NextRequest) {
  const clientIp = getTrustedClientIp(req);
  const nowSec = Math.floor(Date.now() / 1000);

  let body: {
    session_token?: string;
    key_code?: string;
    game_package?: string;
    device_id?: string;
    app_version?: string;
    nonce?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const keyCode = (body.key_code || '').trim();
  const gamePackage = (body.game_package || '').trim();
  const deviceId = (body.device_id || '').trim();
  const appVersion = (body.app_version || '1.0.0').trim();
  const nonce = (body.nonce || '00000000').trim();
  const sessionToken = (body.session_token || '').trim();

  if (
    !INPUT_PATTERNS.KEY_CODE.test(keyCode) ||
    !INPUT_PATTERNS.GAME_PACKAGE.test(gamePackage) ||
    !INPUT_PATTERNS.DEVICE_ID.test(deviceId) ||
    !INPUT_PATTERNS.NONCE.test(nonce)
  ) {
    return NextResponse.json(
      signLicensePayload({
        valid: false,
        code: 'INVALID_INPUT',
        key_code: keyCode.slice(0, 80),
        game_package: gamePackage.slice(0, 120),
        device_id: deviceId.slice(0, 128),
        nonce: nonce.slice(0, 64),
        iat: nowSec,
        ttl_seconds: 0,
        remaining_seconds: 0,
      }),
      { status: 400 }
    );
  }

  // Rate limit heartbeat: max 40 per minute per IP
  const allowed = await checkRateLimit('heartbeat_ip', clientIp, 60, 40);
  if (!allowed) {
    return NextResponse.json(
      signLicensePayload({
        valid: false,
        code: 'RATE_LIMITED',
        key_code: keyCode,
        game_package: gamePackage,
        device_id: deviceId,
        nonce,
        iat: nowSec,
        ttl_seconds: 0,
        remaining_seconds: 0,
      }),
      { status: 429 }
    );
  }

  // Verify the provided session_token signature & claims
  const tokenCheck = verifyHeartbeatSessionToken(sessionToken);
  if (
    tokenCheck.valid &&
    tokenCheck.claims &&
    tokenCheck.claims.key_code === keyCode &&
    tokenCheck.claims.game_package === gamePackage &&
    tokenCheck.claims.device_id === deviceId
  ) {
    const claims = tokenCheck.claims;

    // Check if the key has already reached its expiration timestamp
    if (claims.key_expires_at) {
      const expSec = Math.floor(new Date(claims.key_expires_at).getTime() / 1000);
      if (expSec <= nowSec) {
        return NextResponse.json(
          signLicensePayload({
            valid: false,
            code: 'KEY_EXPIRED',
            key_code: keyCode,
            game_package: gamePackage,
            device_id: deviceId,
            nonce,
            iat: nowSec,
            ttl_seconds: 0,
            remaining_seconds: 0,
          })
        );
      }

      // Fast stateless return if within 5-minute DB check window
      if (nowSec < claims.next_db_check_at) {
        const remainingSeconds = Math.max(0, expSec - nowSec);
        const ttlSeconds = Math.min(180, remainingSeconds);
        return NextResponse.json(
          signLicensePayload({
            valid: true,
            code: 'OK',
            key_code: keyCode,
            game_package: gamePackage,
            device_id: deviceId,
            nonce,
            iat: nowSec,
            ttl_seconds: ttlSeconds,
            remaining_seconds: remainingSeconds,
            expires_at: claims.key_expires_at,
            session_token: sessionToken,
          })
        );
      }
    } else if (nowSec < claims.next_db_check_at) {
      // Lifetime key within 5-minute DB check window
      return NextResponse.json(
        signLicensePayload({
          valid: true,
          code: 'OK',
          key_code: keyCode,
          game_package: gamePackage,
          device_id: deviceId,
          nonce,
          iat: nowSec,
          ttl_seconds: 180,
          remaining_seconds: -1,
          expires_at: null,
          session_token: sessionToken,
        })
      );
    }
  }

  // Otherwise (5 minutes elapsed or no valid session_token), re-verify against PostgreSQL RPC
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      signLicensePayload({
        valid: false,
        code: 'SERVER_UNCONFIGURED',
        key_code: keyCode,
        game_package: gamePackage,
        device_id: deviceId,
        nonce,
        iat: nowSec,
        ttl_seconds: 0,
        remaining_seconds: 0,
      }),
      { status: 503 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('verify_and_bind_key', {
    p_key_code: keyCode,
    p_game_package: gamePackage,
    p_device_id: deviceId,
    p_app_version: appVersion,
    p_client_ip: clientIp,
  });

  if (error || !data) {
    return NextResponse.json(
      signLicensePayload({
        valid: false,
        code: 'SERVER_ERROR',
        key_code: keyCode,
        game_package: gamePackage,
        device_id: deviceId,
        nonce,
        iat: nowSec,
        ttl_seconds: 0,
        remaining_seconds: 0,
      }),
      { status: 500 }
    );
  }

  const rpcResult = data as {
    valid: boolean;
    code: string;
    key_id?: string;
    expires_at?: string | null;
    remaining_seconds?: number;
  };

  if (!rpcResult.valid) {
    return NextResponse.json(
      signLicensePayload({
        valid: false,
        code: rpcResult.code || 'KEY_INVALID',
        key_code: keyCode,
        game_package: gamePackage,
        device_id: deviceId,
        nonce,
        iat: nowSec,
        ttl_seconds: 0,
        remaining_seconds: 0,
      })
    );
  }

  const remainingSeconds =
    typeof rpcResult.remaining_seconds === 'number' ? rpcResult.remaining_seconds : -1;
  const ttlSeconds = remainingSeconds >= 0 ? Math.min(180, remainingSeconds) : 180;

  const refreshedToken = createHeartbeatSessionToken({
    key_id: String(rpcResult.key_id || ''),
    key_code: keyCode,
    game_package: gamePackage,
    device_id: deviceId,
    key_expires_at: rpcResult.expires_at ?? null,
    iat: nowSec,
    next_db_check_at: nowSec + 300,
    exp: nowSec + 360,
  });

  return NextResponse.json(
    signLicensePayload({
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
      session_token: refreshedToken,
    })
  );
}

