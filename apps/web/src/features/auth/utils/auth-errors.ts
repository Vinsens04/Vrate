/**
 * Maps Supabase Auth errors and general errors into safe, user-friendly Bahasa Indonesia messages.
 * Prevents leaking sensitive internals or user enumeration.
 */
export function mapAuthError(error: unknown): string {
  if (!error) {
    return 'An error occurred. Please try again.';
  }

  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : '';

  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Invalid email or password.';
  }

  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'This email is already registered. Please sign in with your account.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Your email has not been confirmed yet. Please check the confirmation link in your inbox.';
  }

  if (lower.includes('password') && (lower.includes('least') || lower.includes('short'))) {
    return 'Password must be at least 8 characters.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('once every 60 seconds')) {
    return 'Too many requests in a short period. For security reasons, please wait a few minutes before trying again.';
  }

  if (lower.includes('token has expired') || lower.includes('otp expired') || lower.includes('invalid token')) {
    return 'The verification or reset link has expired or has already been used. Please request a new link.';
  }

  if (lower.includes('auth session missing') || lower.includes('session expired')) {
    return 'Your session has expired. Please sign in again.';
  }

  if (lower.includes('network') || lower.includes('fetch failed')) {
    return 'Failed to connect to authentication server. Please check your internet connection.';
  }

  if (lower.includes('missing or invalid public configuration') || lower.includes('supabase client config error')) {
    return 'Supabase database connection is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and anon key.';
  }

  return 'Failed to process authentication request. Please try again in a moment.';
}
