import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  checkRateLimit,
  getTrustedClientIp,
  INPUT_PATTERNS,
  verifyTurnstileToken,
} from '@/lib/security';
import {
  generateHirokiKey,
  generateRandomKeyCode,
  signCookieValue,
  verifyCookieValue,
} from '@/lib/crypto-sign';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import {
  ACTIVE_KEYS_COOKIE,
  ActiveKeyCookieItem,
  CLAIM_SID_COOKIE,
  ClaimSidCookiePayload,
} from '@/lib/constants';

/**
 * POST /api/claim/complete
 * Triggered automatically on client mount at `/claim?token=...` (0-click for regular users).
 * Protects against link-preview prefetchers because GET `/claim` is strictly read-only.
 */
export async function POST(req: NextRequest) {
  const clientIp = getTrustedClientIp(req);

  // 1. Rate limit: max 12 completion attempts per 10 minutes per IP
  const allowed = await checkRateLimit('claim_complete', clientIp, 600, 12);
  if (!allowed) {
    return NextResponse.json(
      {
        error: 'RATE_LIMITED',
        message: 'Quá nhiều yêu cầu xác nhận Key. Vui lòng đợi ít phút.',
      },
      { status: 429 }
    );
  }

  let body: {
    claim_token?: string;
    pin_code?: string;
    turnstile_token?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'INVALID_JSON', message: 'Dữ liệu yêu cầu không hợp lệ.' },
      { status: 400 }
    );
  }

  const claimToken = (body.claim_token || '').trim();
  const inputPin = (body.pin_code || '').trim();

  if (!INPUT_PATTERNS.CLAIM_TOKEN.test(claimToken)) {
    return NextResponse.json(
      { error: 'INVALID_CLAIM_TOKEN', message: 'Mã phiên lấy Key (Token) không hợp lệ.' },
      { status: 400 }
    );
  }

  // 2. Verify Turnstile token if enabled
  const turnstile = await verifyTurnstileToken(body.turnstile_token, clientIp);
  if (!turnstile.success) {
    return NextResponse.json(
      {
        error: 'TURNSTILE_FAILED',
        message: 'Xác thực chống bot không hợp lệ. Vui lòng tải lại trang.',
      },
      { status: 403 }
    );
  }

  const cookieStore = await cookies();
  const sidCookie = verifyCookieValue<ClaimSidCookiePayload>(
    cookieStore.get(CLAIM_SID_COOKIE)?.value
  );
  const existingCookieKeys =
    verifyCookieValue<ActiveKeyCookieItem[]>(cookieStore.get(ACTIVE_KEYS_COOKIE)?.value) || [];

  // Fallback for local preview without Supabase configured
  if (!isSupabaseConfigured()) {
    const devKeyCode = generateHirokiKey('12H', 1, 12);
    const expiresAt = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
    const gamePkg = sidCookie?.game_package || 'com.vng.speedvn';
    const newItem: ActiveKeyCookieItem = {
      id: crypto.randomUUID(),
      key_code: devKeyCode,
      game_package: gamePkg,
      all_games: false,
      expires_at: expiresAt,
    };

    const updatedKeys = [newItem, ...existingCookieKeys].slice(0, 10);
    const res = NextResponse.json({
      success: true,
      code: 'OK',
      key_code: devKeyCode,
      game_package: gamePkg,
      expires_at: expiresAt,
      max_devices: 1,
      duration_seconds: 43200,
    });

    res.cookies.set(ACTIVE_KEYS_COOKIE, signCookieValue(updatedKeys), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 14 * 24 * 3600,
    });
    return res;
  }

  const supabase = getSupabaseAdmin();

  // 3. Inspect claim_sessions row to verify browser cookie or PIN fallback if IP/Session changed
  const { data: sessionRow } = await supabase
    .from('claim_sessions')
    .select(
      'id, claim_token, pin_code, game_package, ip_address, status, min_complete_after, provider_verified'
    )
    .or(`claim_token.eq.${claimToken},token_hash.eq.${claimToken}`)
    .maybeSingle();

  if (!sessionRow) {
    return NextResponse.json(
      {
        error: 'CLAIM_NOT_FOUND',
        message: 'Không tìm thấy phiên nhận Key hoặc phiên đã bị dọn dẹp.',
      },
      { status: 404 }
    );
  }

  // Check if cookie matches OR IP matches OR provider postback verified OR user entered the 6-digit PIN
  const cookieMatches = Boolean(sidCookie && sidCookie.claim_token === claimToken);
  const ipMatches = sessionRow.ip_address === clientIp;
  const pinMatches = Boolean(inputPin && sessionRow.pin_code === inputPin);

  if (!cookieMatches && !ipMatches && !sessionRow.provider_verified && !pinMatches) {
    return NextResponse.json(
      {
        error: 'PIN_REQUIRED',
        require_pin: true,
        message:
          'Bạn đã mở link ở trình duyệt khác hoặc đổi mạng (4G/Wi-Fi). Vui lòng nhập mã PIN 6 số lúc bấm Lấy Key để xác nhận!',
      },
      { status: 403 }
    );
  }

  // 4. Mint key atomically via `complete_claim_session` RPC (guarantees zero collisions via retry)
  let rpcData: Record<string, unknown> | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidateKey = generateHirokiKey('12H', 1, 12);

    // Proactive check in DB to ensure non-duplication
    const { data: existingKey } = await supabase
      .from('license_keys')
      .select('id')
      .eq('key_code', candidateKey)
      .maybeSingle();

    if (existingKey) {
      continue; // Collision detected, regenerate candidate key
    }

    const { data, error } = await supabase.rpc('complete_claim_session', {
      p_claim_token: claimToken,
      p_generated_key: candidateKey,
      p_ip: clientIp,
      p_pin_code: inputPin || null,
    });

    if (error) {
      // Unique violation on key_code (23505) -> retry with new random key
      if (error.code === '23505') continue;
      console.error('[/api/claim/complete] RPC error:', error);
      return NextResponse.json(
        { error: 'RPC_ERROR', message: 'Lỗi máy chủ khi cấp Key. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    rpcData = data as Record<string, unknown>;
    break;
  }

  if (!rpcData) {
    return NextResponse.json(
      { error: 'KEY_GENERATION_FAILED', message: 'Không thể khởi tạo mã Key.' },
      { status: 500 }
    );
  }

  if (!rpcData.success) {
    const errCode = String(rpcData.code || 'CLAIM_FAILED');
    if (errCode === 'CLAIM_TOO_FAST') {
      const waitSec = Number(rpcData.retry_after_seconds || 10);
      return NextResponse.json(
        {
          error: 'CLAIM_TOO_FAST',
          retry_after_seconds: waitSec,
          message: `Hệ thống phát hiện hoàn thành link quá nhanh. Vui lòng chờ thêm ${waitSec} giây!`,
        },
        { status: 429 }
      );
    }
    if (errCode === 'CLAIM_EXPIRED') {
      return NextResponse.json(
        {
          error: 'CLAIM_EXPIRED',
          message: 'Phiên lấy Key đã hết hạn (quá 30 phút). Vui lòng quay lại trang chủ lấy Key mới!',
        },
        { status: 410 }
      );
    }
    if (errCode === 'CLAIM_ALREADY_USED') {
      return NextResponse.json(
        {
          error: 'CLAIM_ALREADY_USED',
          message: 'Phiên lấy Key này đã được sử dụng và Key trước đó không còn hiệu lực.',
        },
        { status: 410 }
      );
    }
    return NextResponse.json(
      {
        error: errCode,
        message: 'Không thể hoàn tất nhận Key (' + errCode + ').',
      },
      { status: 400 }
    );
  }

  // 5. Success! Store the minted key in the signed `hiroki_active_keys` browser cookie
  const newKeyItem: ActiveKeyCookieItem = {
    id: String(rpcData.key_id),
    key_code: String(rpcData.key_code),
    game_package: String(rpcData.game_package),
    all_games: false,
    expires_at: rpcData.expires_at ? String(rpcData.expires_at) : null,
  };

  const nowMs = Date.now();
  const deduplicated = [
    newKeyItem,
    ...existingCookieKeys.filter(
      (k) =>
        k.id !== newKeyItem.id &&
        k.key_code !== newKeyItem.key_code &&
        (!k.expires_at || new Date(k.expires_at).getTime() > nowMs)
    ),
  ].slice(0, 10);

  const response = NextResponse.json({
    success: true,
    code: String(rpcData.code || 'OK'),
    key_id: newKeyItem.id,
    key_code: newKeyItem.key_code,
    game_package: newKeyItem.game_package,
    expires_at: newKeyItem.expires_at,
    max_devices: Number(rpcData.max_devices || 1),
    duration_seconds: 43200,
  });

  response.cookies.set(ACTIVE_KEYS_COOKIE, signCookieValue(deduplicated), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 14 * 24 * 3600,
  });

  return response;
}

