import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getTrustedClientIp } from '@/lib/security';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

/**
 * GET /api/admin/blacklist
 * Returns blacklisted IPs/Devices and recent verify_logs (KEY_NOT_FOUND & BLACKLISTED).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ blacklist: [], verify_logs: [], dbConnected: false });
  }

  const supabase = getSupabaseAdmin();
  const [blRes, logsRes] = await Promise.all([
    supabase.from('blacklist').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('verify_logs').select('*').order('created_at', { ascending: false }).limit(100),
  ]);

  return NextResponse.json({
    blacklist: blRes.data || [],
    verify_logs: logsRes.data || [],
    dbConnected: true,
  });
}

/**
 * POST /api/admin/blacklist
 * Adds an IP or DEVICE (HWID) to the blacklist.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'DB_UNCONFIGURED' }, { status: 503 });
  }

  const clientIp = getTrustedClientIp(req);
  const body = (await req.json()) as {
    target_type?: 'DEVICE' | 'IP';
    target_value?: string;
    reason?: string;
  };

  const targetType = body.target_type === 'IP' ? 'IP' : 'DEVICE';
  const targetValue = (body.target_value || '').trim();
  const reason = (body.reason || 'Vi phạm điều khoản sử dụng').trim();

  if (!targetValue) {
    return NextResponse.json(
      { error: 'MISSING_VALUE', message: 'Vui lòng nhập mã HWID hoặc địa chỉ IP cần chặn.' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('blacklist')
    .upsert(
      {
        target_type: targetType,
        target_value: targetValue,
        reason,
      },
      { onConflict: 'target_type,target_value' }
    )
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from('audit_logs').insert({
    action: 'ADD_BLACKLIST',
    details: { target_type: targetType, target_value: targetValue, reason },
    ip_address: clientIp,
  });

  return NextResponse.json({ success: true, item: data });
}

/**
 * DELETE /api/admin/blacklist
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'DB_UNCONFIGURED' }, { status: 503 });
  }

  const clientIp = getTrustedClientIp(req);
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('blacklist').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    action: 'REMOVE_BLACKLIST',
    details: { id },
    ip_address: clientIp,
  });

  return NextResponse.json({ success: true });
}

