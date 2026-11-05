import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifySameOriginCsrf } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  if (!verifySameOriginCsrf(req)) {
    return NextResponse.json({ error: 'CSRF_ORIGIN_MISMATCH' }, { status: 403 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete(ADMIN_COOKIE_NAME);
  return res;
}

