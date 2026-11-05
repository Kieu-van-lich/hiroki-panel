import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  checkRateLimit,
  generateClaimToken,
  generateSixDigitPin,
  getTrustedClientIp,
  INPUT_PATTERNS,
  verifyTurnstileToken,
} from '@/lib/security';
import { signCookieValue, verifyCookieValue } from '@/lib/crypto-sign';
import { createShortenedClaimLink } from '@/lib/shortener';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import {
  ACTIVE_KEYS_COOKIE,
  ActiveKeyCookieItem,
  CLAIM_SID_COOKIE,
  ClaimSidCookiePayload,
} from '@/lib/constants';

/**
 * POST /api/claim/start
 * Creates a PENDING claim session without minting any license key yet.
 * Key creation only happens after the user completes the shortened link at POST /api/claim/complete.
 */
export async function POST(req: NextRequest) {
  const clientIp = getTrustedClientIp(req);

  // 1. Rate limit: max 8 claim starts per 10 minutes per IP
  const allowed = await checkRateLimit('claim_start', clientIp, 600, 8);
  if (!allowed) {
    return NextResponse.json(
      {
        error: 'RATE_LIMITED',
        message: 'Bạn thao tác quá nhanh. Vui lòng đợi ít phút rồi thử lại!',
      },
      { status: 429 }
    );
  }

  let body: { game_package?: string; turnstile_token?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'INVALID_JSON', message: 'Dữ liệu yêu cầu không hợp lệ.' },
      { status: 400 }
    );
  }

  const rawGamePackage = (body.game_package || '').trim();
  // Support comma-separated package strings (e.g., Liên Quân) by taking primary or validating segments
  const packageSegments = rawGamePackage.split(',').map((s) => s.trim()).filter(Boolean);
  if (
    packageSegments.length === 0 ||
    !packageSegments.every((seg) => INPUT_PATTERNS.GAME_PACKAGE.test(seg))
  ) {
    return NextResponse.json(
      { error: 'INVALID_GAME', message: 'Gói game được chọn không hợp lệ.' },
      { status: 400 }
    );
  }

  // 2. Verify Cloudflare Turnstile
  const turnstile = await verifyTurnstileToken(body.turnstile_token, clientIp);
  if (!turnstile.success) {
    return NextResponse.json(
      {
        error: 'TURNSTILE_FAILED',
        message: 'Xác thực chống bot (Turnstile) không thành công. Vui lòng thử lại.',
      },
      { status: 403 }
    );
  }

  // 3. Determine claim wait seconds and build claim token + 6-digit PIN
  const nowMs = Date.now();
  let minClaimSeconds = 0;
  const claimToken = generateClaimToken();
  const pinCode = generateSixDigitPin();
  let sessionId = crypto.randomUUID();

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ||
    req.nextUrl.origin;
  const destinationClaimUrl = `${origin}/claim?token=${encodeURIComponent(claimToken)}`;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();

    // Check IP blacklist
    const { data: blacklisted } = await supabase
      .from('blacklist')
      .select('id, reason')
      .eq('target_type', 'IP')
      .eq('target_value', clientIp)
      .maybeSingle();

    if (blacklisted) {
      return NextResponse.json(
        {
          error: 'BLACKLISTED',
          message: blacklisted.reason || 'Địa chỉ IP của bạn đã bị từ chối truy cập.',
        },
        { status: 403 }
      );
    }

    // Verify game exists and is active
    const primaryPkg = packageSegments[0];
    const { data: gameRow } = await supabase
      .from('games')
      .select('package_name, is_active, maintenance_msg')
      .ilike('package_name', `%${primaryPkg}%`)
      .maybeSingle();

    if (!gameRow) {
      return NextResponse.json(
        { error: 'GAME_NOT_FOUND', message: 'Không tìm thấy tựa game này trên hệ thống.' },
        { status: 404 }
      );
    }

    if (!gameRow.is_active) {
      return NextResponse.json(
        {
          error: 'GAME_MAINTENANCE',
          message:
            gameRow.maintenance_msg || 'Tựa game này đang bảo trì nâng cấp. Vui lòng quay lại sau!',
        },
        { status: 503 }
      );
    }


    // If running in direct dev claim mode, set wait time to 0 so local testing is instant
    if (
      process.env.ALLOW_DIRECT_CLAIM === 'true' &&
      !process.env.SHORTENER_API_URL
    ) {
      minClaimSeconds = 0;
    }

    // Check if IP already has a recent PENDING claim session for this game within last 2 minutes
    const twoMinAgoIso = new Date(nowMs - 120_000).toISOString();
    await supabase
      .from('claim_sessions')
      .update({ status: 'EXPIRED' })
      .eq('ip_address', clientIp)
      .eq('status', 'PENDING')
      .lt('created_at', twoMinAgoIso);
  } else {
    if (process.env.ALLOW_DIRECT_CLAIM === 'true') {
      minClaimSeconds = 0;
    }
  }

  // 5. Call Link Shortener Adapter (Fail-Closed unless ALLOW_DIRECT_CLAIM=true)
  const shortenerRes = await createShortenedClaimLink(destinationClaimUrl);
  if (!shortenerRes.success || !shortenerRes.shortenedUrl) {
    return NextResponse.json(
      {
        error: shortenerRes.errorCode || 'SHORTENER_UNAVAILABLE',
        message:
          shortenerRes.errorMessage ||
          'Dịch vụ rút gọn link tạm thời gián đoạn. Vui lòng thử lại sau!',
      },
      { status: 503 }
    );
  }

  // 6. Persist PENDING claim session in Supabase + increment claims_started metric
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const minCompleteAfter = new Date(nowMs + minClaimSeconds * 1000).toISOString();
    const expiresAt = new Date(nowMs + 30 * 60 * 1000).toISOString();

    const { data: insertedSession, error: insertError } = await supabase
      .from('claim_sessions')
      .insert({
        claim_token: claimToken,
        pin_code: pinCode,
        game_package: rawGamePackage,
        ip_address: clientIp,
        user_agent: (req.headers.get('user-agent') || '').slice(0, 255),
        shortener_provider: shortenerRes.providerName,
        shortened_url: shortenerRes.shortenedUrl,
        status: 'PENDING',
        min_complete_after: minCompleteAfter,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (insertError || !insertedSession) {
      console.error('[/api/claim/start] Insert error:', insertError);
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Không thể khởi tạo phiên lấy Key. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    sessionId = insertedSession.id;
    await supabase.rpc('increment_daily_metric', {
      p_column: 'claims_started',
      p_delta: 1,
    });
  }

  // 7. Set HTTP-only signed cookie `hiroki_claim_sid` (valid 30 minutes)
  const sidPayload: ClaimSidCookiePayload = {
    session_id: sessionId,
    claim_token: claimToken,
    pin_code: pinCode,
    game_package: rawGamePackage,
    created_at: nowMs,
  };

  const res = NextResponse.json({
    success: true,
    redirect_url: shortenerRes.shortenedUrl,
    pin_code: pinCode,
    min_wait_seconds: minClaimSeconds,
    is_direct_dev: Boolean(shortenerRes.isDirectBypass),
  });

  res.cookies.set(CLAIM_SID_COOKIE, signCookieValue(sidPayload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 60,
  });

  return res;
}

