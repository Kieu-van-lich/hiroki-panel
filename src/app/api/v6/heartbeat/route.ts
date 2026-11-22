import { NextRequest, NextResponse } from 'next/server';
import { verifyHeartbeatSessionToken } from '@/lib/crypto-sign';

/**
 * POST /api/v6/heartbeat
 * Maintains in-game cheat session (event=P1003 result=0) every 40s - 120s.
 * Uses fast in-RAM Ed25519 token verification (<15ms).
 */
export async function POST(req: NextRequest) {
  const nowSec = Math.floor(Date.now() / 1000);

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty
    }

    const sessionToken = String(body.session_token || body.token || body.session_id || '').trim();
    const leaseId = String(body.lease_id || '').trim();

    // 1. Verify via compact Ed25519 session token
    if (sessionToken && sessionToken.includes('.')) {
      const tokenResult = verifyHeartbeatSessionToken(sessionToken);
      if (tokenResult.valid && tokenResult.claims) {
        const remainingSec = Math.max(0, tokenResult.claims.exp - nowSec);
        return NextResponse.json({
          protocol: 6,
          status: 'ok',
          code: 200,
          subcode: 1,
          valid: true,
          event: 'P1003',
          result: 0,
          session_id: sessionToken,
          token: sessionToken,
          remaining_seconds: remainingSec,
          lease_expires: nowSec + 60,
          server_time: nowSec,
        });
      }
    }

    // 2. Fallback check: if valid lease_id or fallback session is provided
    if (leaseId || (sessionToken && (sessionToken.startsWith('session_') || sessionToken.startsWith('tok_')))) {
      return NextResponse.json({
        protocol: 6,
        status: 'ok',
        code: 200,
        subcode: 1,
        valid: true,
        event: 'P1003',
        result: 0,
        lease_id: leaseId,
        session_id: sessionToken,
        token: sessionToken,
        remaining_seconds: 43200,
        lease_expires: nowSec + 60,
        server_time: nowSec,
      });
    }

    // 3. Fallback permissive: keep session alive
    return NextResponse.json({
      protocol: 6,
      status: 'ok',
      code: 200,
      subcode: 1,
      valid: true,
      event: 'P1003',
      result: 0,
      remaining_seconds: 43200,
      lease_expires: nowSec + 60,
      server_time: nowSec,
    });
  } catch (err: unknown) {
    console.error('[/api/v6/heartbeat] Error:', err);
    return NextResponse.json(
      {
        protocol: 6,
        status: 'error',
        valid: false,
        code: 400,
        event: 'E5206',
        result: -5,
        message: 'Yêu cầu kiểm tra phiên không hợp lệ.',
      },
      { status: 400 }
    );
  }
}

/**
 * GET /api/v6/heartbeat
 * Health status of heartbeat daemon.
 */
export async function GET() {
  return NextResponse.json({
    service: 'Hiroki AuthV6 Heartbeat API',
    status: 'ok',
    server_time: Math.floor(Date.now() / 1000),
  });
}
