import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyCookieValue } from '@/lib/crypto-sign';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import {
  ACTIVE_KEYS_COOKIE,
  ActiveKeyCookieItem,
  CLAIM_SID_COOKIE,
  ClaimSidCookiePayload,
} from '@/lib/constants';

/**
 * GET /api/keys/my-keys
 * Reads ONLY the signed browser cookie (`hiroki_active_keys`) to show the user's own keys
 * and live remaining time without accepting arbitrary key lookup strings (anti-enumeration).
 */
export async function GET() {
  const cookieStore = await cookies();
  const rawKeysCookie = cookieStore.get(ACTIVE_KEYS_COOKIE)?.value;
  const rawSidCookie = cookieStore.get(CLAIM_SID_COOKIE)?.value;

  const storedKeys = verifyCookieValue<ActiveKeyCookieItem[]>(rawKeysCookie) || [];
  const pendingClaim = verifyCookieValue<ClaimSidCookiePayload>(rawSidCookie);

  const nowMs = Date.now();

  if (!isSupabaseConfigured()) {
    const validLocalKeys = storedKeys
      .filter((k) => !k.expires_at || new Date(k.expires_at).getTime() > nowMs)
      .map((k) => ({
        ...k,
        remaining_seconds: k.expires_at
          ? Math.max(0, Math.floor((new Date(k.expires_at).getTime() - nowMs) / 1000))
          : -1,
        used_devices: 0,
        max_devices: 1,
      }));

    return NextResponse.json({
      active_keys: validLocalKeys,
      pending_claim: pendingClaim
        ? {
            game_package: pendingClaim.game_package,
            pin_code: pendingClaim.pin_code,
            created_at: pendingClaim.created_at,
          }
        : null,
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const keyIds = storedKeys.map((k) => k.id).filter(Boolean);

    let liveKeys: Array<{
      id: string;
      key_code: string;
      game_package: string | null;
      all_games: boolean;
      expires_at: string | null;
      remaining_seconds: number;
      used_devices: number;
      max_devices: number;
    }> = [];

    if (keyIds.length > 0) {
      const { data } = await supabase
        .from('license_keys')
        .select(
          'id, key_code, game_package, all_games, expires_at, max_devices, is_active, key_devices(count)'
        )
        .in('id', keyIds)
        .eq('is_active', true);

      if (data) {
        liveKeys = data
          .filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > nowMs)
          .map((row) => {
            const devCountArr = row.key_devices as unknown as Array<{ count: number }>;
            const usedDevices =
              Array.isArray(devCountArr) && devCountArr[0] ? Number(devCountArr[0].count) : 0;
            return {
              id: row.id,
              key_code: row.key_code,
              game_package: row.game_package,
              all_games: row.all_games,
              expires_at: row.expires_at,
              remaining_seconds: row.expires_at
                ? Math.max(0, Math.floor((new Date(row.expires_at).getTime() - nowMs) / 1000))
                : -1,
              used_devices: usedDevices,
              max_devices: row.max_devices,
            };
          });
      }
    }

    return NextResponse.json({
      active_keys: liveKeys,
      pending_claim: pendingClaim
        ? {
            game_package: pendingClaim.game_package,
            pin_code: pendingClaim.pin_code,
            created_at: pendingClaim.created_at,
          }
        : null,
    });
  } catch (err) {
    console.error('[/api/keys/my-keys] Error:', err);
    return NextResponse.json({ active_keys: [], pending_claim: null });
  }
}
