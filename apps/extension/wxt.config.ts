import { defineConfig } from 'wxt';

function getSupabaseHostPermission(): string {
  const supabaseUrl = process.env.WXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl.trim().length > 0) {
    try {
      const url = new URL(supabaseUrl.trim());
      return `${url.origin}/*`;
    } catch {
      // Fall through to exact linked project host
    }
  }
  return 'https://pwufymnvrtyvorsxcgmo.supabase.co/*';
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Vrate',
    description: 'Track movies, TV series, and anime with TMDB and AniList metadata integration.',
    version: '0.1.0',
    permissions: ['activeTab', 'storage', 'scripting'],
    host_permissions: [
      'http://localhost:3000/*',
      getSupabaseHostPermission(),
    ],
    optional_host_permissions: [
      'https://miruro.bz/*',
      'https://www.miruro.bz/*',
      'https://*.theanimecommunity.com/*',
      'https://theanimecommunity.com/*',
    ],
    action: {
      default_title: 'Vrate Browser Extension',
    },
  },
});
