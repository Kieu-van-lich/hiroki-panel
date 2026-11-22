import { NextRequest, NextResponse } from 'next/server';

const GITHUB_STAGE2_URL =
  'https://raw.githubusercontent.com/Kieu-van-lich/lib_BloodStrike/main/stage2_payload.so';

/**
 * GET /api/v6/bootstrap
 * Redirects directly to GitHub Fastly CDN for Stage-2 payload binary.
 */
export async function GET() {
  return NextResponse.redirect(GITHUB_STAGE2_URL, 302);
}

/**
 * POST /api/v6/bootstrap
 * Handles bootstrap actions:
 * - action === 'issue': Returns JSON ticket and receipt manifest.
 * - action === 'download': Redirects 302 to GitHub Releases CDN.
 */
export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty or form-encoded
    }

    const action = String(body.action || '').trim().toLowerCase();

    if (action === 'download') {
      return NextResponse.redirect(GITHUB_STAGE2_URL, 302);
    }

    // Default or action === 'issue': return signed bootstrap manifest ticket
    const nowSec = Math.floor(Date.now() / 1000);
    const nonce = String(body.nonce || 'hiroki_bs_' + nowSec);
    const epk = String(body.epk || '');

    return NextResponse.json({
      status: 'success',
      code: 'E0',
      action: 'issue',
      ticket: `hiroki_ticket_${nowSec}_${nonce.slice(0, 16)}`,
      profile: 'elf-bootstrap-v1',
      artifact_sha256: '9951664d50c18c5e933486a6358cbb5928d3fb9bcf46ecbfa877f864e24eb374',
      size_bytes: 6087440,
      download_url: GITHUB_STAGE2_URL,
      manifest: {
        channel: 'stable',
        platform: 'android',
        arch: 'arm64-v8a',
        nonce,
        epk,
        iat: nowSec,
        exp: nowSec + 86400,
      },
    });
  } catch (err: unknown) {
    console.error('[/api/v6/bootstrap] Error:', err);
    return NextResponse.redirect(GITHUB_STAGE2_URL, 302);
  }
}
