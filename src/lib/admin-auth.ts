import 'server-only';
import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const ADMIN_COOKIE_NAME = 'hiroki_admin_session';

function getJwtSecretBytes(): Uint8Array {
  const secret =
    process.env.ADMIN_JWT_SECRET ||
    'hiroki-dev-only-jwt-secret-key-please-change-in-production-32b';
  return new TextEncoder().encode(secret);
}

export interface AdminSessionPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

/**
 * Constant-time password comparison against ADMIN_PASSWORD env variable.
 */
export function verifyAdminPassword(inputPassword: string): boolean {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword || !inputPassword) {
    return false;
  }

  const inputHash = crypto.createHash('sha256').update(inputPassword).digest();
  const expectedHash = crypto.createHash('sha256').update(expectedPassword).digest();
  return crypto.timingSafeEqual(inputHash, expectedHash);
}

/**
 * Signs an Admin JWT valid for 12 hours.
 */
export async function createAdminJwt(): Promise<string> {
  return await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(getJwtSecretBytes());
}

/**
 * Verifies an Admin JWT string.
 */
export async function verifyAdminJwt(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes(), {
      algorithms: ['HS256'],
    });
    if (payload.role !== 'admin') return null;
    return payload as unknown as AdminSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Verifies same-origin on state-changing Admin requests (POST, PUT, PATCH, DELETE) to prevent CSRF.
 */
export function verifySameOriginCsrf(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');

  if (!origin || !host) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Guards an Admin API route handler. Checks JWT cookie and CSRF Origin header.
 */
export async function requireAdminAuth(
  req: NextRequest
): Promise<{ authorized: true } | { authorized: false; response: NextResponse }> {
  if (!verifySameOriginCsrf(req)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'CSRF_ORIGIN_MISMATCH', message: 'Origin header không hợp lệ.' },
        { status: 403 }
      ),
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Phiên đăng nhập Admin đã hết hạn.' },
        { status: 401 }
      ),
    };
  }

  const session = await verifyAdminJwt(token);
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Token Admin không hợp lệ hoặc đã hết hạn.' },
        { status: 401 }
      ),
    };
  }

  return { authorized: true };
}

