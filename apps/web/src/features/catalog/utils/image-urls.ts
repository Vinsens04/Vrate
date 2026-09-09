/**
 * Whitelist of allowed image hostnames for Next Image optimization.
 * Matches apps/web/next.config.ts configuration.
 */
export const ALLOWED_IMAGE_HOSTNAMES = new Set([
  'image.tmdb.org',
  's4.anilist.co',
  'img.anilist.co',
  'cdn.myanimelist.net',
  'media.kitsu.app',
]);

/**
 * Validates whether an image URL is an absolute URL matching allowed hostnames.
 */
export function isAllowedImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return false;

  try {
    const parsed = new URL(trimmed);
    return ALLOWED_IMAGE_HOSTNAMES.has(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Builds a secure, sized TMDB image URL.
 * Never requests 'original' unless explicitly requested.
 */
export function buildTmdbImageUrl(
  path: string | null | undefined,
  size: 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original' = 'w342'
): string | null {
  if (!path || typeof path !== 'string') return null;
  const cleanPath = path.trim().replace(/^\/+/, '');
  if (!cleanPath) return null;
  return `https://image.tmdb.org/t/p/${size}/${cleanPath}`;
}

/**
 * Sanitizes AniList and external descriptions by safely removing HTML tags
 * while preserving newlines and paragraph breaks.
 */
export function sanitizeOverview(htmlOrText: string | null | undefined): string | null {
  if (!htmlOrText || typeof htmlOrText !== 'string') return null;

  let text = htmlOrText;

  // Replace <br>, <br/>, <br /> with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Replace </p>, </div>, </li> with newlines
  text = text.replace(/<\/(p|div|li)>/gi, '\n');

  // Strip all other HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ');

  // Collapse multiple consecutive blank lines to at most two
  text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');

  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : null;
}
