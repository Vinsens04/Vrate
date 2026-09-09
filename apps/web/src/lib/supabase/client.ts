import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';
import { getPublicSupabaseConfig } from './config';

/**
 * Creates a browser-side Supabase client using @supabase/ssr.
 * Safe for client components; only uses public anon key and URL.
 */
export function createClient() {
  const { url, anonKey } = getPublicSupabaseConfig();
  return createBrowserClient<Database>(url, anonKey);
}
