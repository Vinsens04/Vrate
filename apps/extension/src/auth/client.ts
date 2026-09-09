import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getExtensionConfig, isExtensionSupabaseConfigured } from '../config/env.ts';
import { extensionStorageAdapter } from './storage.ts';

let clientInstance: SupabaseClient | null = null;

/**
 * Creates or retrieves the singleton Supabase client configured for Chrome Extension.
 * - Uses custom namespaced chrome.storage.local adapter
 * - Automatic background token refreshing
 * - Persisted session across service worker terminations
 * - Strictly anon-key only (no service-role key)
 */
export function getExtensionSupabaseClient(): SupabaseClient | null {
  if (!isExtensionSupabaseConfigured()) {
    return null;
  }

  if (clientInstance) {
    return clientInstance;
  }

  const { supabaseUrl, supabaseAnonKey } = getExtensionConfig();

  clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: extensionStorageAdapter,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return clientInstance;
}

/**
 * Resets the client instance (useful for testing or full reinitialization).
 */
export function resetExtensionSupabaseClient(): void {
  clientInstance = null;
}
