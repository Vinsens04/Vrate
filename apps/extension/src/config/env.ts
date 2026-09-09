export interface ExtensionConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  webAppUrl: string;
}

/**
 * Checks if Supabase credentials are configured in the extension environment.
 * Safe to call anywhere without throwing.
 */
export function isExtensionSupabaseConfigured(): boolean {
  const url = import.meta.env.WXT_PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.WXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && url.trim().length > 0 && anonKey && anonKey.trim().length > 0);
}

/**
 * Returns the validated extension environment configuration.
 * Throws a safe error without leaking credential values if variables are missing.
 */
export function getExtensionConfig(): ExtensionConfig {
  const url = import.meta.env.WXT_PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.WXT_PUBLIC_SUPABASE_ANON_KEY;
  const webAppUrl = import.meta.env.WXT_PUBLIC_WEB_APP_URL || 'http://localhost:3000';

  if (!url || !url.trim() || !anonKey || !anonKey.trim()) {
    throw new Error(
      'Konfigurasi Supabase untuk Browser Extension belum lengkap. Pastikan WXT_PUBLIC_SUPABASE_URL dan WXT_PUBLIC_SUPABASE_ANON_KEY telah diatur pada apps/extension/.env.local.'
    );
  }

  return {
    supabaseUrl: url.trim(),
    supabaseAnonKey: anonKey.trim(),
    webAppUrl: webAppUrl.trim(),
  };
}
