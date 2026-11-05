import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  createAdminJwt,
  requireAdminAuth,
  verifyAdminPassword,
  verifySameOriginCsrf,
} from '@/lib/admin-auth';
import { checkRateLimit, getTrustedClientIp } from '@/lib/security';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

/**
 * GET /api/admin/login
 * Checks if current browser has an active Admin JWT session.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    dbConnected: isSupabaseConfigured(),
  });
}

/**
 * POST /api/admin/login
 * Authenticates Admin password with rate limiting (5 attempts / 15m per IP) and sets HTTP-only cookie.
 */
export async function POST(req: NextRequest) {
  if (!verifySameOriginCsrf(req)) {
    return NextResponse.json(
      { error: 'CSRF_ORIGIN_MISMATCH', message: 'Origin không hợp lệ.' },
      { status: 403 }
    );
  }

  const clientIp = getTrustedClientIp(req);

  // Brute-force protection: max 5 login attempts per 15 minutes per IP
  const allowed = await checkRateLimit('admin_login', clientIp, 900, 5);
  if (!allowed) {
    return NextResponse.json(
      {
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút!',
      },
      { status: 429 }
    );
  }

  let body: { password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'INVALID_JSON', message: 'Dữ liệu không hợp lệ.' },
      { status: 400 }
    );
  }

  const password = body.password || '';
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      {
        error: 'ADMIN_UNCONFIGURED',
        message: 'Biến môi trường ADMIN_PASSWORD chưa được cấu hình trên máy chủ.',
      },
      { status: 503 }
    );
  }

  const isValid = verifyAdminPassword(password);
  if (!isValid) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      await supabase.from('audit_logs').insert({
        action: 'ADMIN_LOGIN_FAILED',
        details: { ip: clientIp },
        ip_address: clientIp,
      });
    }
    return NextResponse.json(
      { error: 'INVALID_CREDENTIALS', message: 'Mật khẩu Admin không chính xác.' },
      { status: 401 }
    );
  }

  const jwt = await createAdminJwt();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    await supabase.from('audit_logs').insert({
      action: 'ADMIN_LOGIN_SUCCESS',
      details: { ip: clientIp },
      ip_address: clientIp,
    });
  }

  const res = NextResponse.json({
    success: true,
    authenticated: true,
    dbConnected: isSupabaseConfigured(),
  });

  res.cookies.set(ADMIN_COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 12 * 3600,
  });

  return res;
}

