import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 * Never expose SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY via NEXT_PUBLIC_*.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server environment variables.'
    );
  }

  cachedAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cachedAdminClient;
}

/**
 * Helper to check if Supabase environment variables are configured.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

