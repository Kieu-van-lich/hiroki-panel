import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { formatDurationTag, generateHirokiKey, generateRandomKeyCode } from '@/lib/crypto-sign';
import { getTrustedClientIp, INPUT_PATTERNS } from '@/lib/security';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

/**
 * GET /api/admin/keys
 * Lists license keys with their bound devices (`key_devices`).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ keys: [], total: 0, dbConnected: false });
  }

  const url = req.nextUrl;
  const search = (url.searchParams.get('search') || '').trim();
  const keyType = (url.searchParams.get('key_type') || '').trim();
  const gamePackage = (url.searchParams.get('game_package') || '').trim();
  const limit = Math.min(200, Math.max(10, Number(url.searchParams.get('limit') || 100)));

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('license_keys')
    .select(
      `
      id,
      key_code,
      key_type,
      game_package,
      all_games,
      max_devices,
      duration_seconds,
      start_on_first_use,
      activate_before,
      created_at,
      activated_at,
      expires_at,
      is_active,
      created_by,
      note,
      last_used_at,
      key_devices (
        id,
        device_id,
        device_name,
        game_package,
        first_seen,
        last_seen,
        ip_address
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`key_code.ilike.%${search}%,note.ilike.%${search}%`);
  }
  if (keyType) {
    query = query.eq('key_type', keyType);
  }
  if (gamePackage) {
    query = query.eq('game_package', gamePackage);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json(
      { error: 'DB_ERROR', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    keys: data || [],
    total: count || 0,
    dbConnected: true,
  });
}

/**
 * POST /api/admin/keys
 * Creates single or bulk custom keys with full control over format, duration, start_on_first_use, and max_devices.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: 'DB_UNCONFIGURED',
        message: 'Chưa kết nối Supabase (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).',
      },
      { status: 503 }
    );
  }

  const clientIp = getTrustedClientIp(req);
  const supabase = getSupabaseAdmin();
  let body: {
    custom_key_code?: string;
    prefix?: string;
    groups?: number;
    chars_per_group?: number;
    quantity?: number;
    key_type?: string;
    game_package?: string | null;
    all_games?: boolean;
    max_devices?: number;
    duration_seconds?: number | null;
    start_on_first_use?: boolean;
    activate_before_days?: number | null;
    note?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const quantity = Math.min(500, Math.max(1, Number(body.quantity || 1)));
  const customKeyCode = (body.custom_key_code || '').trim();
  const prefix = (body.prefix ?? 'HIROKI-VIP').trim();
  const groups = Math.min(6, Math.max(1, Number(body.groups || 3)));
  const charsPerGroup = Math.min(8, Math.max(3, Number(body.chars_per_group || 4)));

  const allGames = Boolean(body.all_games);
  const gamePackage = allGames ? null : (body.game_package || '').trim() || null;

  if (!allGames && !gamePackage) {
    return NextResponse.json(
      { error: 'MISSING_GAME', message: 'Vui lòng chọn tựa game hoặc bật Tất cả Game.' },
      { status: 400 }
    );
  }

  const maxDevices = Math.max(0, Math.min(10000, Number(body.max_devices ?? 1)));
  const isLifetime =
    body.duration_seconds === null ||
    body.duration_seconds === undefined ||
    Number(body.duration_seconds) <= 0 ||
    body.key_type === 'VIP_LIFETIME';

  const durationSeconds = isLifetime ? null : Math.max(60, Number(body.duration_seconds));
  const startOnFirstUse = isLifetime ? false : Boolean(body.start_on_first_use);

  let keyType = body.key_type || 'CUSTOM';
  if (isLifetime) {
    keyType = 'VIP_LIFETIME';
  }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // Compute expires_at if NOT start_on_first_use and NOT lifetime
  const expiresAtIso =
    !isLifetime && !startOnFirstUse && durationSeconds
      ? new Date(nowMs + durationSeconds * 1000).toISOString()
      : null;

  const activateBeforeIso =
    startOnFirstUse && body.activate_before_days && Number(body.activate_before_days) > 0
      ? new Date(nowMs + Number(body.activate_before_days) * 86400 * 1000).toISOString()
      : null;

  const rowsToInsert: Array<Record<string, unknown>> = [];

  if (quantity === 1 && customKeyCode) {
    if (!INPUT_PATTERNS.KEY_CODE.test(customKeyCode)) {
      return NextResponse.json(
        {
          error: 'INVALID_KEY_FORMAT',
          message:
            'Định dạng Key tùy chỉnh chỉ cho phép chữ cái, số, dấu gạch ngang (-) và gạch dưới (_), độ dài 3–80 ký tự.',
        },
        { status: 400 }
      );
    }
    rowsToInsert.push({
      key_code: customKeyCode,
      key_type: keyType,
      game_package: gamePackage,
      all_games: allGames,
      max_devices: maxDevices,
      duration_seconds: durationSeconds,
      start_on_first_use: startOnFirstUse,
      activate_before: activateBeforeIso,
      activated_at: startOnFirstUse ? null : nowIso,
      expires_at: expiresAtIso,
      is_active: true,
      created_by: 'ADMIN',
      note: (body.note || '').trim() || null,
    });
  } else {
    const durationTag = formatDurationTag(durationSeconds);
    const devTag = maxDevices === 0 ? '0' : String(maxDevices);
    const generatedSet = new Set<string>();

    while (generatedSet.size < quantity) {
      let code: string;
      if (prefix && prefix !== 'HIROKI' && prefix !== 'HIROKI-VIP' && prefix !== 'Hiroki') {
        code = generateRandomKeyCode(prefix, groups, charsPerGroup);
      } else {
        code = generateHirokiKey(durationTag, devTag, 12);
      }
      generatedSet.add(code);
    }

    // Double check existing keys in database to prevent any collision
    const candidateArray = Array.from(generatedSet);
    const { data: existingRows } = await supabase
      .from('license_keys')
      .select('key_code')
      .in('key_code', candidateArray);

    if (existingRows && existingRows.length > 0) {
      const existingSet = new Set(existingRows.map((r) => r.key_code));
      for (const eCode of existingSet) {
        generatedSet.delete(eCode);
      }
      while (generatedSet.size < quantity) {
        generatedSet.add(generateHirokiKey(durationTag, devTag, 12));
      }
    }
    for (const code of generatedSet) {
      rowsToInsert.push({
        key_code: code,
        key_type: keyType,
        game_package: gamePackage,
        all_games: allGames,
        max_devices: maxDevices,
        duration_seconds: durationSeconds,
        start_on_first_use: startOnFirstUse,
        activate_before: activateBeforeIso,
        activated_at: startOnFirstUse ? null : nowIso,
        expires_at: expiresAtIso,
        is_active: true,
        created_by: 'ADMIN',
        note: (body.note || '').trim() || null,
      });
    }
  }

  const { data: createdKeys, error } = await supabase
    .from('license_keys')
    .insert(rowsToInsert)
    .select('*');

  if (error) {
    const msg =
      error.code === '23505'
        ? 'Mã Key này đã tồn tại trên hệ thống. Vui lòng chọn tên Key khác!'
        : error.message;
    return NextResponse.json({ error: 'DB_INSERT_ERROR', message: msg }, { status: 400 });
  }

  const createdCount = createdKeys?.length || 0;

  await Promise.all([
    supabase.rpc('increment_daily_metric', {
      p_column: 'admin_keys_created',
      p_delta: createdCount,
    }),
    supabase.from('audit_logs').insert({
      action: 'CREATE_KEYS',
      details: {
        count: createdCount,
        key_type: keyType,
        all_games: allGames,
        game_package: gamePackage,
        max_devices: maxDevices,
        duration_seconds: durationSeconds,
        start_on_first_use: startOnFirstUse,
      },
      ip_address: clientIp,
    }),
  ]);

  return NextResponse.json({
    success: true,
    created_count: createdCount,
    keys: createdKeys || [],
  });
}

/**
 * PATCH /api/admin/keys
 * Modify an existing key: toggle active, reset HWID devices, extend duration, or update max_devices.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'DB_UNCONFIGURED' }, { status: 503 });
  }

  const clientIp = getTrustedClientIp(req);
  const supabase = getSupabaseAdmin();
  const body = (await req.json()) as {
    id?: string;
    action?: 'toggle_active' | 'reset_hwid' | 'remove_device' | 'extend_time' | 'update_max_devices';
    is_active?: boolean;
    device_row_id?: string;
    add_seconds?: number;
    max_devices?: number;
  };

  if (!body.id || !body.action) {
    return NextResponse.json({ error: 'MISSING_PARAMS' }, { status: 400 });
  }

  if (body.action === 'toggle_active') {
    const { error } = await supabase
      .from('license_keys')
      .update({ is_active: Boolean(body.is_active) })
      .eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('audit_logs').insert({
      action: body.is_active ? 'UNLOCK_KEY' : 'LOCK_KEY',
      details: { key_id: body.id },
      ip_address: clientIp,
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === 'reset_hwid') {
    const { error } = await supabase
      .from('key_devices')
      .delete()
      .eq('key_id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('audit_logs').insert({
      action: 'RESET_KEY_HWID',
      details: { key_id: body.id },
      ip_address: clientIp,
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === 'remove_device' && body.device_row_id) {
    const { error } = await supabase
      .from('key_devices')
      .delete()
      .eq('id', body.device_row_id)
      .eq('key_id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('audit_logs').insert({
      action: 'REMOVE_SINGLE_DEVICE',
      details: { key_id: body.id, device_row_id: body.device_row_id },
      ip_address: clientIp,
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === 'extend_time') {
    const addSec = Number(body.add_seconds || 0);
    if (addSec <= 0) {
      return NextResponse.json({ error: 'INVALID_SECONDS' }, { status: 400 });
    }
    const { data: keyRow } = await supabase
      .from('license_keys')
      .select('expires_at, duration_seconds')
      .eq('id', body.id)
      .single();

    if (!keyRow) {
      return NextResponse.json({ error: 'KEY_NOT_FOUND' }, { status: 404 });
    }

    const baseTimeMs = keyRow.expires_at
      ? Math.max(Date.now(), new Date(keyRow.expires_at).getTime())
      : Date.now();
    const newExpiresIso = new Date(baseTimeMs + addSec * 1000).toISOString();
    const newDurationSec = Number(keyRow.duration_seconds || 0) + addSec;

    const { error } = await supabase
      .from('license_keys')
      .update({
        expires_at: newExpiresIso,
        duration_seconds: newDurationSec,
      })
      .eq('id', body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('audit_logs').insert({
      action: 'EXTEND_KEY_TIME',
      details: { key_id: body.id, add_seconds: addSec, new_expires_at: newExpiresIso },
      ip_address: clientIp,
    });
    return NextResponse.json({ success: true, expires_at: newExpiresIso });
  }

  if (body.action === 'update_max_devices') {
    const maxDev = Math.max(0, Math.min(10000, Number(body.max_devices ?? 1)));
    const { error } = await supabase
      .from('license_keys')
      .update({ max_devices: maxDev })
      .eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('audit_logs').insert({
      action: 'UPDATE_MAX_DEVICES',
      details: { key_id: body.id, max_devices: maxDev },
      ip_address: clientIp,
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'UNKNOWN_ACTION' }, { status: 400 });
}

/**
 * DELETE /api/admin/keys
 * Hard-deletes a key by `id` (cascade deletes its `key_devices`), or purges all expired keys.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'DB_UNCONFIGURED' }, { status: 503 });
  }

  const clientIp = getTrustedClientIp(req);
  const supabase = getSupabaseAdmin();
  const url = req.nextUrl;
  const keyId = url.searchParams.get('id');
  const purgeExpired = url.searchParams.get('purge_expired') === 'true';

  if (purgeExpired) {
    const { data, error } = await supabase.rpc('cleanup_expired_data', {
      p_grace_minutes: 0,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('audit_logs').insert({
      action: 'PURGE_EXPIRED_DATA',
      details: data || {},
      ip_address: clientIp,
    });
    return NextResponse.json({ success: true, result: data });
  }

  if (!keyId) {
    return NextResponse.json({ error: 'MISSING_KEY_ID' }, { status: 400 });
  }

  const { error } = await supabase.from('license_keys').delete().eq('id', keyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    action: 'DELETE_KEY',
    details: { key_id: keyId },
    ip_address: clientIp,
  });

  return NextResponse.json({ success: true });
}

