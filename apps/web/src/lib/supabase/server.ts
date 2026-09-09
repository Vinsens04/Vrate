import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';
import { getPublicSupabaseConfig } from './config';

/**
 * Creates a server-side Supabase client for Next.js App Router
 * (Server Components, Server Actions, and Route Handlers).
 * Uses Next.js async cookies to read and persist user session tokens.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseConfig();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if middleware is used to refresh sessions.
        }
      },
    },
  });
}
