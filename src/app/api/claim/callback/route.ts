import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { INPUT_PATTERNS } from '@/lib/security';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Verifies postback secret in constant time.
 */
function verifyCallbackSecret(provided: string | null): boolean {
  const expected = process.env.SHORTENER_CALLBACK_SECRET;
  if (!expected || !provided) return false;
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * GET / POST /api/claim/callback
 * Server-to-server postback webhook from Link Shortener provider to mark `provider_verified = true`.
 */
async function handleCallback(req: NextRequest) {
  const url = req.nextUrl;
  let token = url.searchParams.get('token') || '';
  let secret =
    url.searchParams.get('secret') || req.headers.get('x-callback-secret') || '';

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      token = token || body.token || body.claim_token || '';
      secret = secret || body.secret || '';
    } catch {
      // Ignore body parse error if query params are used
    }
  }

  if (!verifyCallbackSecret(secret)) {
    return NextResponse.json(
      { error: 'INVALID_CALLBACK_SECRET' },
      { status: 401 }
    );
  }

  if (!INPUT_PATTERNS.CLAIM_TOKEN.test(token)) {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, dev: true });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('claim_sessions')
    .update({ provider_verified: true })
    .eq('claim_token', token);

  if (error) {
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  return handleCallback(req);
}

export async function POST(req: NextRequest) {
  return handleCallback(req);
}

