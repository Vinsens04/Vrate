import 'server-only';

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { getPublicSupabaseConfig } from '@/lib/supabase/config';
import type { Database } from '@/types/database.types';

import { extractBearerToken } from './extract-token';

export interface AuthenticateExtensionResult {
  success: boolean;
  user?: User;
  userClient?: SupabaseClient<Database>;
  error?: string;
  status?: number;
}

/**
 * Extracts and validates the Bearer token from the Authorization header.
 * - Enforces header length bounds (<= 2048 chars)
 * - Verifies token cryptographically via Supabase Auth server (never just decoding JWT payload)
 * - Constructs a user-scoped Supabase client with anon key enforcing Row Level Security (RLS)
 * - Never touches or requires service-role key
 * - Never prints or logs the token
 */
export async function authenticateExtensionRequest(
  request: Request
): Promise<AuthenticateExtensionResult> {
  const authHeader = request.headers.get('authorization');
  const tokenExtraction = extractBearerToken(authHeader);

  if (!tokenExtraction.success || !tokenExtraction.token) {
    return {
      success: false,
      error: tokenExtraction.error,
      status: tokenExtraction.status,
    };
  }

  const token = tokenExtraction.token;

  let config;
  try {
    config = getPublicSupabaseConfig();
  } catch {
    return {
      success: false,
      error: 'Konfigurasi Supabase server belum siap.',
      status: 503,
    };
  }

  // Base client to verify token against Supabase Auth
  const authVerifierClient = createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    const { data, error } = await authVerifierClient.auth.getUser(token);

    if (error || !data.user) {
      return {
        success: false,
        error: 'Token autentikasi tidak valid atau telah kedaluwarsa.',
        status: 401,
      };
    }

    const user = data.user;

    // Create user-scoped client carrying user's Bearer token.
    // Enforces RLS on all table queries without using service-role key.
    const userClient = createClient<Database>(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    return {
      success: true,
      user,
      userClient,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.toLowerCase() : '';
    const isNetwork = message.includes('failed to fetch') || message.includes('network');

    return {
      success: false,
      error: isNetwork
        ? 'Layanan autentikasi Supabase tidak dapat dijangkau.'
        : 'Gagal memverifikasi token autentikasi.',
      status: isNetwork ? 503 : 401,
    };
  }
}
