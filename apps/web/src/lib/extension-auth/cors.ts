/**
 * Parses and returns the set of allowed extension origins.
 * Configuration read from EXTENSION_ALLOWED_ORIGINS (comma-separated list).
 */
export function getAllowedOrigins(): Set<string> {
  const envOrigins = process.env.EXTENSION_ALLOWED_ORIGINS || '';
  const list = envOrigins
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  return new Set(list);
}

/**
 * Verifies if an Origin header is permitted.
 * - Non-browser requests (origin === null) are allowed through to Bearer token validation.
 * - Browser requests with Origin must match the registered whitelist.
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) {
    return true; // Non-browser / server request
  }

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.has(origin);
}

/**
 * Returns safe CORS headers echoing the specific origin only if whitelisted.
 * Never uses wildcard '*'.
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: 'Origin',
  };

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }

  return headers;
}

/**
 * Handles CORS preflight OPTIONS requests.
 */
export function handleCorsPreflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  const origin = request.headers.get('origin');
  if (origin && !isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'Origin tidak diizinkan.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', Vary: 'Origin' },
    });
  }

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
