import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getEd25519KeySet } from '@/lib/crypto-sign';
import { getTrustedClientIp } from '@/lib/security';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

/**
 * GET /api/admin/metrics
 * Returns 30-day historical `daily_metrics`, live counts, system settings, audit logs,
 * and the Ed25519 Public Keys (`k1`, `k2`) for the in-game Client SDK snippet generator.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) return auth.response;

  const keySet = getEd25519KeySet();
  const ed25519Info = {
    activeKid: keySet.activeKid,
    publicKeyK1B64: keySet.publicKeysSpkiB64.k1,
    publicKeyK2B64: keySet.publicKeysSpkiB64.k2,
    usingCustomEnvKeys: Boolean(process.env.ED25519_PRIVATE_KEY_K1_B64),
  };

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      dbConnected: false,
      liveCounts: {
        activeKeys: 0,
        boundDevices: 0,
        pendingClaims: 0,
        blacklistedCount: 0,
      },
      dailyMetrics: [],
      settings: {
        min_claim_seconds: '25',
        default_free_key_hours: '12',
        announcement_banner: 'Hệ thống lấy Key miễn phí 12h tự động — Hiroki Panel',
        telegram_support_url: 'https://t.me/hirokipanel',
        youtube_tutorial_url: '',
      },
      auditLogs: [],
      ed25519: ed25519Info,
    });
  }

  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const [
    activeKeysRes,
    boundDevicesRes,
    pendingClaimsRes,
    blacklistCountRes,
    metricsRes,
    settingsRes,
    auditRes,
  ] = await Promise.all([
    supabase
      .from('license_keys')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
    supabase.from('key_devices').select('id', { count: 'exact', head: true }),
    supabase
      .from('claim_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING')
      .gt('expires_at', nowIso),
    supabase.from('blacklist').select('id', { count: 'exact', head: true }),
    supabase
      .from('daily_metrics')
      .select('*')
      .order('metric_date', { ascending: false })
      .limit(30),
    supabase.from('system_settings').select('key, value'),
    supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const settingsMap: Record<string, string> = {};
  if (settingsRes.data) {
    for (const row of settingsRes.data) {
      settingsMap[row.key] = row.value;
    }
  }

  return NextResponse.json({
    dbConnected: true,
    liveCounts: {
      activeKeys: activeKeysRes.count || 0,
      boundDevices: boundDevicesRes.count || 0,
      pendingClaims: pendingClaimsRes.count || 0,
      blacklistedCount: blacklistCountRes.count || 0,
    },
    dailyMetrics: metricsRes.data || [],
    settings: settingsMap,
    auditLogs: auditRes.data || [],
    ed25519: ed25519Info,
  });
}

/**
 * POST /api/admin/metrics
 * Updates `system_settings` key-value configuration.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'DB_UNCONFIGURED' }, { status: 503 });
  }

  const clientIp = getTrustedClientIp(req);
  const body = (await req.json()) as {
    settings?: Record<string, string>;
  };

  if (!body.settings || typeof body.settings !== 'object') {
    return NextResponse.json({ error: 'INVALID_SETTINGS' }, { status: 400 });
  }

  const allowedKeys = [
    'min_claim_seconds',
    'default_free_key_hours',
    'announcement_banner',
    'telegram_support_url',
    'youtube_tutorial_url',
  ];

  const rows = Object.entries(body.settings)
    .filter(([k]) => allowedKeys.includes(k))
    .map(([key, value]) => ({
      key,
      value: String(value ?? '').trim(),
      updated_at: new Date().toISOString(),
    }));

  const supabase = getSupabaseAdmin();
  if (rows.length > 0) {
    const { error } = await supabase
      .from('system_settings')
      .upsert(rows, { onConflict: 'key' });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await supabase.from('audit_logs').insert({
    action: 'UPDATE_SYSTEM_SETTINGS',
    details: body.settings,
    ip_address: clientIp,
  });

  return NextResponse.json({ success: true });
}

