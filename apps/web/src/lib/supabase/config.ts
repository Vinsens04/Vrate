import { z } from 'zod';

/**
 * ==============================================================================
 * SUPABASE ENVIRONMENT CONFIGURATION & VALIDATION
 * ==============================================================================
 * Validates environment variables using Zod.
 * Allows builds to succeed even if environment variables are not yet configured.
 * Throws explicit errors only at runtime when client creation is attempted without config.
 */

// Schema for client-side / public configuration
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY must not be empty'),
});

// Schema for server-side service-role configuration
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY must not be empty'),
});

export interface PublicSupabaseConfig {
  url: string;
  anonKey: string;
}

export interface ServerSupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

/**
 * Checks if basic public Supabase configuration is present.
 * Safe to call at any time (does not throw).
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && url.trim().length > 0 && anonKey && anonKey.trim().length > 0);
}

/**
 * Checks if Google OAuth is explicitly enabled via environment flag.
 */
export function isGoogleAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';
}


export function normalizeSupabaseUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

/**
 * Returns validated public Supabase configuration.
 * Throws an explicit error if variables are missing or invalid.
 */
export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    const errorMessages = result.error.issues.map((e) => e.message).join('; ');
    throw new Error(
      `[Supabase Client Config Error] Missing or invalid public configuration: ${errorMessages}. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local.`
    );
  }

  return {
    url: normalizeSupabaseUrl(result.data.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

/**
 * Returns validated server-only Supabase service-role configuration.
 * Throws an explicit error if variables are missing or invalid.
 */
export function getServerSupabaseConfig(): ServerSupabaseConfig {
  const result = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!result.success) {
    const errorMessages = result.error.issues.map((e) => e.message).join('; ');
    throw new Error(
      `[Supabase Admin Config Error] Missing or invalid server configuration: ${errorMessages}. Please configure SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in apps/web/.env.local.`
    );
  }

  return {
    url: normalizeSupabaseUrl(result.data.NEXT_PUBLIC_SUPABASE_URL),
    serviceRoleKey: result.data.SUPABASE_SERVICE_ROLE_KEY,
  };
}
