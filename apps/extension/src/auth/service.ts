import { getExtensionConfig, isExtensionSupabaseConfigured } from '../config/env.ts';
import { getExtensionSupabaseClient } from './client.ts';
import { mapExtensionAuthError } from './errors.ts';
import type {
  ExtensionAuthResponse,
  ExtensionAuthState,
  SafeUser,
  UserProfile,
  UserSettings,
} from './schemas.ts';
import { clearVrateAuthStorage, initStorageAccessLevel } from './storage.ts';

/**
 * Initializes trusted storage access level and verifies Supabase client readiness.
 */
export async function initAuthService(): Promise<void> {
  await initStorageAccessLevel();
  getExtensionSupabaseClient();
}

/**
 * Helper to extract safe profile and user settings using the authenticated client.
 */
async function fetchSafeProfileAndSettings(
  userId: string
): Promise<{ profile: UserProfile | null; settings: UserSettings | null }> {
  const supabase = getExtensionSupabaseClient();
  if (!supabase) {
    return { profile: null, settings: null };
  }

  let profile: UserProfile | null = null;
  let settings: UserSettings | null = null;

  try {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (profileData) {
      profile = {
        id: profileData.id,
        displayName: profileData.display_name,
        avatarUrl: profileData.avatar_url,
      };
    }
  } catch {
    // Non-fatal, profile is optional
  }

  try {
    const { data: settingsData } = await supabase
      .from('user_settings')
      .select(
        'auto_detect, confirm_before_tracking, auto_track_progress, auto_complete_threshold, auto_add_after_seconds, theme'
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsData) {
      settings = {
        autoDetect: settingsData.auto_detect,
        confirmBeforeTracking: settingsData.confirm_before_tracking,
        autoTrackProgress: settingsData.auto_track_progress,
        autoCompleteThreshold: settingsData.auto_complete_threshold,
        autoAddAfterSeconds: settingsData.auto_add_after_seconds ?? undefined,
        theme: settingsData.theme ?? undefined,
      };
    }
  } catch {
    // Non-fatal, fallback to null
  }

  return { profile, settings };
}

/**
 * Retrieves the current safe authentication state.
 * Handles session restoration, token expiration, and offline resilience.
 */
export async function getAuthState(): Promise<ExtensionAuthResponse> {
  if (!isExtensionSupabaseConfigured()) {
    return {
      success: false,
      state: 'unconfigured',
      error:
        'Ekstensi belum dikonfigurasi dengan Supabase URL dan Anon Key. Periksa file .env.local.',
    };
  }

  const supabase = getExtensionSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      state: 'unconfigured',
      error: 'Supabase client gagal diinisialisasi.',
    };
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      const isOffline =
        error.message.toLowerCase().includes('failed to fetch') ||
        error.message.toLowerCase().includes('network');

      if (isOffline) {
        return {
          success: false,
          state: 'offline',
          error: 'Tidak dapat terhubung ke server autentikasi.',
        };
      }

      await clearVrateAuthStorage();
      return {
        success: false,
        state: 'expired',
        error: mapExtensionAuthError(error),
      };
    }

    const session = data.session;
    if (!session || !session.user) {
      return {
        success: true,
        state: 'signed_out',
        user: null,
      };
    }

    // Check if token is expired or close to expiry (within 30 seconds)
    const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
    const now = Date.now();

    if (expiresAt && expiresAt - now < 30000) {
      try {
        const { data: refreshData, error: refreshErr } =
          await supabase.auth.refreshSession();

        if (refreshErr) {
          const isOffline =
            refreshErr.message.toLowerCase().includes('failed to fetch') ||
            refreshErr.message.toLowerCase().includes('network');

          if (isOffline) {
            return {
              success: false,
              state: 'offline',
              error: 'Tidak dapat memperbarui sesi karena jaringan terputus.',
            };
          }

          await clearVrateAuthStorage();
          return {
            success: false,
            state: 'expired',
            error: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
          };
        }

        if (!refreshData.session) {
          await clearVrateAuthStorage();
          return {
            success: true,
            state: 'signed_out',
            user: null,
          };
        }
      } catch {
        return {
          success: false,
          state: 'offline',
          error: 'Tidak dapat terhubung ke server autentikasi.',
        };
      }
    }

    const user = session.user;
    const { profile, settings } = await fetchSafeProfileAndSettings(user.id);

    const displayName =
      profile?.displayName ||
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email?.split('@')[0] ||
      'Pengguna';

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email || '',
      displayName,
      avatarUrl: profile?.avatarUrl || (user.user_metadata?.avatar_url as string) || null,
    };

    return {
      success: true,
      state: 'signed_in',
      user: safeUser,
      profile,
      settings,
    };
  } catch (err: unknown) {
    return {
      success: false,
      state: 'error',
      error: mapExtensionAuthError(err),
    };
  }
}

/**
 * Signs in using email and password via Supabase Auth.
 * Never stores or logs the password.
 */
export async function signIn(
  email: string,
  password: string
): Promise<ExtensionAuthResponse> {
  if (!isExtensionSupabaseConfigured()) {
    return {
      success: false,
      state: 'unconfigured',
      error: 'Konfigurasi Supabase belum lengkap pada ekstensi.',
    };
  }

  const supabase = getExtensionSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      state: 'unconfigured',
      error: 'Supabase client tidak tersedia.',
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      return {
        success: false,
        state: 'error',
        error: mapExtensionAuthError(error),
      };
    }

    const user = data.user;
    const { profile, settings } = await fetchSafeProfileAndSettings(user.id);

    const displayName =
      profile?.displayName ||
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email?.split('@')[0] ||
      'Pengguna';

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email || '',
      displayName,
      avatarUrl: profile?.avatarUrl || (user.user_metadata?.avatar_url as string) || null,
    };

    return {
      success: true,
      state: 'signed_in',
      user: safeUser,
      profile,
      settings,
    };
  } catch (err: unknown) {
    return {
      success: false,
      state: 'error',
      error: mapExtensionAuthError(err),
    };
  }
}

/**
 * Signs out from Supabase Auth and removes all Vrate auth keys from storage.
 * Does not logout the web application session.
 */
export async function signOut(): Promise<ExtensionAuthResponse> {
  const supabase = getExtensionSupabaseClient();

  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Non-fatal, local storage cleanup below will guarantee signed-out state
    }
  }

  await clearVrateAuthStorage();

  return {
    success: true,
    state: 'signed_out',
    user: null,
  };
}

/**
 * Internal background helper to obtain current valid access token.
 * Used exclusively for Bearer requests to backend APIs. Never sent to popup or content script.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getExtensionSupabaseClient();
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Helper to open web application routes in new Chrome tabs.
 */
export async function openWebUrl(pathOrUrl: string): Promise<void> {
  const { webAppUrl } = getExtensionConfig();
  let fullUrl: string;

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    fullUrl = pathOrUrl;
  } else {
    const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    fullUrl = `${webAppUrl}${cleanPath}`;
  }

  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    await chrome.tabs.create({ url: fullUrl });
  }
}
