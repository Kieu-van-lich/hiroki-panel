import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { DEFAULT_GAMES } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      games: DEFAULT_GAMES,
      settings: {
        announcement_banner: 'Hệ thống lấy Key miễn phí 12h tự động — Hiroki Panel',
        telegram_support_url: 'https://t.me/hirokipanel',
        youtube_tutorial_url: 'https://youtube.com',
        min_claim_seconds: 25,
        default_free_key_hours: 12,
      },
      turnstileSiteKey,
      dbConnected: false,
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const [gamesRes, settingsRes] = await Promise.all([
      supabase
        .from('games')
        .select(
          'package_name, game_name, icon_url, is_active, maintenance_msg, min_version, download_url, features_json, sort_order'
        )
        .order('sort_order', { ascending: true }),
      supabase.from('system_settings').select('key, value'),
    ]);

    const settingsMap: Record<string, string> = {};
    if (settingsRes.data) {
      for (const row of settingsRes.data) {
        settingsMap[row.key] = row.value;
      }
    }

    return NextResponse.json({
      games: gamesRes.data && gamesRes.data.length > 0 ? gamesRes.data : DEFAULT_GAMES,
      settings: {
        announcement_banner:
          settingsMap.announcement_banner ||
          'Hệ thống lấy Key miễn phí 12h tự động — Hiroki Panel',
        telegram_support_url:
          settingsMap.telegram_support_url || 'https://t.me/hirokipanel',
        youtube_tutorial_url: settingsMap.youtube_tutorial_url || '',
        min_claim_seconds: Number(settingsMap.min_claim_seconds || 25),
        default_free_key_hours: Number(settingsMap.default_free_key_hours || 12),
      },
      turnstileSiteKey,
      dbConnected: true,
    });
  } catch (err) {
    console.error('[/api/games] Error:', err);
    return NextResponse.json({
      games: DEFAULT_GAMES,
      settings: {
        announcement_banner: 'Hệ thống lấy Key miễn phí 12h tự động — Hiroki Panel',
        telegram_support_url: 'https://t.me/hirokipanel',
        youtube_tutorial_url: '',
        min_claim_seconds: 25,
        default_free_key_hours: 12,
      },
      turnstileSiteKey,
      dbConnected: false,
    });
  }
}
