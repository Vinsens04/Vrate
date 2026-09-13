/**
 * Maps raw Supabase or network error objects to safe, user-friendly English messages.
 * Never leaks raw secrets, credentials, or internal server dumps.
 */
export function mapExtensionAuthError(error: unknown): string {
  if (!error) {
    return 'An unknown error occurred.';
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid email or password')
  ) {
    return 'Invalid email or password.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Email not verified. Please check your inbox to confirm your email.';
  }

  if (
    lower.includes('jwt expired') ||
    lower.includes('token is expired') ||
    lower.includes('session expired') ||
    lower.includes('invalid refresh token') ||
    lower.includes('refresh_token_not_found')
  ) {
    return 'Your session has expired. Please sign in again.';
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('networkrequestfailed') ||
    lower.includes('timeout')
  ) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many sign-in attempts. Please wait a moment before trying again.';
  }

  return 'Authentication failed. Please check your credentials.';
}
