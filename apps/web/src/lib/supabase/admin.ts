import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { getServerSupabaseConfig } from './config';

/**
 * Creates a privileged Supabase client with the service-role key.
 * 
 * SECURITY WARNING:
 * - This function is strictly server-only (protected by 'server-only' package).
 * - Bypasses Row Level Security (RLS).
 * - Must NEVER be exposed to client components, browser bundles, or Chrome Extension.
 * - Created dynamically per call to prevent build failures when environment variables are unset.
 */
export function createAdminClient() {
  const { url, serviceRoleKey } = getServerSupabaseConfig();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
