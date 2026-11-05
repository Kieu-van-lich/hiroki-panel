import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getTrustedClientIp } from '@/lib/security';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { DEFAULT_GAMES } from '@/lib/constants';

/**
 * GET /api/admin/games
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ games: DEFAULT_GAMES, dbConnected: false });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ games: data || [], dbConnected: true });
}

/**
 * POST /api/admin/games
 * Adds a new game or upserts an existing game package.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'DB_UNCONFIGURED' }, { status: 503 });
  }

  const clientIp = getTrustedClientIp(req);
  const body = (await req.json()) as {
    package_name?: string;
    game_name?: string;
    icon_url?: string;
    is_active?: boolean;
    maintenance_msg?: string;
    min_version?: string;
    download_url?: string;
    features_json?: string[];
    sort_order?: number;
  };

  const packageName = (body.package_name || '').trim();
  const gameName = (body.game_name || '').trim();

  if (!packageName || !gameName) {
    return NextResponse.json(
      { error: 'MISSING_FIELDS', message: 'Vui lòng nhập Tên Game và Package Name.' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('games')
    .upsert(
      {
        package_name: packageName,
        game_name: gameName,
        icon_url: (body.icon_url || '/assets/icon/default-game.png').trim(),
        is_active: body.is_active !== false,
        maintenance_msg: body.maintenance_msg || '',
        min_version: (body.min_version || '1.0.0').trim(),
        download_url: (body.download_url || '').trim(),
        features_json: Array.isArray(body.features_json) ? body.features_json : [],
        sort_order: Number(body.sort_order || 10),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'package_name' }
    )
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from('audit_logs').insert({
    action: 'UPSERT_GAME',
    details: { package_name: packageName, game_name: gameName, is_active: body.is_active },
    ip_address: clientIp,
  });

  return NextResponse.json({ success: true, game: data });
}

/**
 * DELETE /api/admin/games
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'DB_UNCONFIGURED' }, { status: 503 });
  }

  const clientIp = getTrustedClientIp(req);
  const packageName = req.nextUrl.searchParams.get('package_name');
  if (!packageName) {
    return NextResponse.json({ error: 'MISSING_PACKAGE_NAME' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('package_name', packageName);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    action: 'DELETE_GAME',
    details: { package_name: packageName },
    ip_address: clientIp,
  });

  return NextResponse.json({ success: true });
}

