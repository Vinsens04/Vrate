/**
 * URL Utilities and Safe Parsing for Media Detection
 */

/**
 * Safely parses a string into a URL object.
 * Returns null if the URL is invalid or uses an unsupported protocol.
 */
export function safeParseUrl(rawUrl: string | undefined | null): URL | null {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    // Disallow non-web protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/**
 * Validates whether the hostname strictly matches Miruro domains.
 * Rejects attacker subdomains (e.g. miruro.bz.attacker.com), port spoofing, etc.
 */
export function isMiruroHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized === 'miruro.bz' || normalized === 'www.miruro.bz';
}

/**
 * Validates whether the URL is an exact Miruro watch page.
 * Path format: /watch/{anilistId}/{slug}
 */
export function isMiruroWatchUrl(url: URL): boolean {
  if (url.protocol !== 'https:') {
    return false;
  }

  if (!isMiruroHost(url.hostname)) {
    return false;
  }

  const segments = url.pathname.split('/').filter((s) => s.length > 0);
  if (segments[0] !== 'watch' || !segments[1]) {
    return false;
  }

  // Segment 1 must be a valid positive integer (AniList ID)
  const anilistId = Number.parseInt(segments[1], 10);
  if (!Number.isSafeInteger(anilistId) || anilistId <= 0 || anilistId > 100_000_000) {
    return false;
  }

  return true;
}

/**
 * Safely decodes a URL slug into a readable title hint.
 * Replaces dashes and underscores with spaces, cleans punctuation, and capitalizes words.
 */
export function safeDecodeSlug(slug: string | undefined | null): string {
  if (!slug || typeof slug !== 'string') {
    return '';
  }

  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // Fall back to undecoded string if malformed percent encoding
    decoded = slug;
  }

  // Replace separators with single space
  const words = decoded
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!words) {
    return '';
  }

  // Capitalize first letter of each word for clean presentation
  const titleHint = words
    .split(' ')
    .map((w) => {
      if (w.length === 0) return '';
      // Retain acronyms (e.g. 'OVA', 'II', 'BD')
      if (w === w.toUpperCase() && w.length > 1) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');

  // Enforce max length limit
  return titleHint.slice(0, 250).trim();
}

/**
 * Safely extracts episode number from URL query parameters.
 * Validates parameter 'ep' is a positive integer.
 * Ignores all other query parameters.
 */
export function parseEpisodeParam(searchParams: URLSearchParams): number | null {
  const epVal = searchParams.get('ep');
  if (!epVal) {
    return null;
  }

  // Must match integer string strictly (no floats or negative)
  if (!/^\d+$/.test(epVal.trim())) {
    return null;
  }

  const ep = Number.parseInt(epVal.trim(), 10);
  if (Number.isSafeInteger(ep) && ep > 0 && ep <= 100_000) {
    return ep;
  }

  return null;
}
