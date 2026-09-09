/**
 * Validates redirect paths to prevent open redirect vulnerabilities.
 * 
 * Rules:
 * - Must be non-empty string.
 * - Must start with a single '/'.
 * - Must NOT start with '//' (protocol-relative URL) or '/\' (backslash evasion).
 * - Must NOT contain a scheme like 'http:', 'https:', 'javascript:', 'data:'.
 */
export function getSafeRedirectPath(input: string | null | undefined, fallback = '/dashboard'): string {
  if (!input || typeof input !== 'string') {
    return fallback;
  }

  const trimmed = input.trim();

  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }

  // Prevent scheme-based redirections (e.g. /http: or /javascript:)
  if (trimmed.includes(':')) {
    return fallback;
  }

  return trimmed;
}
