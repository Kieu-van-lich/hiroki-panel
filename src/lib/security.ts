import 'server-only';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase';

/**
 * Validation patterns matching 0001_init.sql constraints.
 */
export const INPUT_PATTERNS = {
  KEY_CODE: /^[A-Za-z0-9_-]{3,80}$/,
  DEVICE_ID: /^[A-Za-z0-9._:-]{4,128}$/,
  GAME_PACKAGE: /^[a-zA-Z0-9._]{3,120}$/,
  APP_VERSION: /^[0-9]{1,6}(\.[0-9]{1,6}){0,3}$/,
  NONCE: /^[A-Za-z0-9_=-]{8,64}$/,
  CLAIM_TOKEN: /^[A-Za-z0-9_-]{24,128}$/,
  PIN_CODE: /^[0-9]{6}$/,
};

/**
 * Extracts client IP securely on Vercel / Cloudflare without trusting spoofable X-Forwarded-For tail values.
 */
export function getTrustedClientIp(req: NextRequest): string {
  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    return vercelIp.split(',')[0].trim();
  }
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0].trim();
  }
  return '127.0.0.1';
}

/**
 * Hashes a rate-limit bucket identifier with SHA-256 + salt so raw IPs or keys are never stored in rate_limits.
 */
export function hashRateLimitBucket(scope: string, identifier: string): string {
  const salt = process.env.RATE_LIMIT_SALT || 'hiroki-rate-limit-salt-v1';
  const digest = crypto
    .createHash('sha256')
    .update(`${salt}:${scope}:${identifier}`)
    .digest('hex')
    .slice(0, 40);
  return `${scope}:${digest}`;
}

// Fallback in-memory rate limit store when running local unit tests without Supabase
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Consumes 1 unit from a rate-limit bucket using the atomic PostgreSQL RPC `consume_rate_limit`.
 * Falls back to in-memory map only if Supabase is not configured in local dev.
 */
export async function checkRateLimit(
  scope: string,
  identifier: string,
  windowSeconds: number,
  maxHits: number
): Promise<boolean> {
  const bucketKey = hashRateLimitBucket(scope, identifier);

  if (!isSupabaseConfigured()) {
    const now = Date.now();
    const existing = memoryBuckets.get(bucketKey);
    if (!existing || existing.resetAt <= now) {
      memoryBuckets.set(bucketKey, { count: 1, resetAt: now + windowSeconds * 1000 });
      return true;
    }
    if (existing.count >= maxHits) {
      return false;
    }
    existing.count += 1;
    return true;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('consume_rate_limit', {
      p_bucket_key: bucketKey,
      p_window_seconds: windowSeconds,
      p_max_hits: maxHits,
    });

    if (error) {
      console.error('[checkRateLimit] RPC error:', error.message);
      return true;
    }
    return Boolean(data);
  } catch (err) {
    console.error('[checkRateLimit] Exception:', err);
    return true;
  }
}

/**
 * Verifies a Cloudflare Turnstile token server-side.
 * If TURNSTILE_SECRET_KEY is not set (or uses Cloudflare's dummy test key in dev), handles gracefully.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If no Turnstile secret key configured or explicitly disabled in local dev
  if (!secretKey || secretKey === '1x0000000000000000000000000000000AA') {
    return { success: true };
  }

  if (!token || typeof token !== 'string' || token.trim().length < 10) {
    return { success: false, error: 'TURNSTILE_MISSING' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!res.ok) {
      return { success: false, error: 'TURNSTILE_HTTP_ERROR' };
    }

    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      return {
        success: false,
        error: data['error-codes']?.join(',') || 'TURNSTILE_INVALID',
      };
    }

    return { success: true };
  } catch (err) {
    console.error('[verifyTurnstileToken] Error:', err);
    return { success: false, error: 'TURNSTILE_NETWORK_ERROR' };
  }
}

/**
 * Generates a 6-digit numeric PIN for cross-browser / In-App-Browser claim recovery.
 */
export function generateSixDigitPin(): string {
  const num = crypto.randomInt(100000, 1000000);
  return String(num);
}

/**
 * Generates a high-entropy URL-safe claim token (256-bit).
 */
export function generateClaimToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

