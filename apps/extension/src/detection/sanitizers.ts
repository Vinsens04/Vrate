/**
 * Data Sanitizers & Extractors for Page Metadata
 * Defensive DOM extraction without leaking private data, executing scripts, or reading user inputs.
 */

const MAX_TITLE_LENGTH = 250;
const MAX_JSON_LD_CHARS = 65536; // 64KB max per JSON-LD block to prevent memory exhaustion

/**
 * Known common streaming/site suffixes that should be removed from page titles conservatively.
 * Preserves the actual title while stripping clutter like "- Nonton Streaming Sub Indo".
 */
const STRIP_PATTERNS: RegExp[] = [
  // Delimiter + keywords at end of title: e.g. "Title | Watch Free Online"
  /[-–—|:]\s*(?:watch\s+online|watch\s+free|watch|nonton\s+anime|nonton\s+streaming|nonton\s+gratis|nonton|streaming|stream)\b.*$/i,
  // Subtitle suffixes: e.g. "Title - Subtitle Indonesia", "Title [Sub Indo]"
  /[-–—|:]?\s*\[?\b(?:sub(?:title)?\s+indonesia|sub\s+indo|english\s+sub|eng\s+sub)\b\]?.*$/i,
  // Site branding suffixes: e.g. "Title - Miruro", "Title | Netflix"
  /[-–—|:]\s*(?:miruro|bilibili|iqiyi|crunchyroll|vidio|viu|hotstar|wetv|anoboy|samehadaku|otakudesu|kuramanime|loklok|rebahin|indoxxi|lk21|layarkaca21|dramacute|bioskopkeren|gomunime|anichin|oploverz|komikcast|melongmovie|dutafilm|pahe|zero|kissasian|gogoanime|aniwave)\b.*$/i,
  // Trailing episode indicators: e.g. "- Episode 1", "Ep 01"
  /[-–—|:]\s*(?:episode|ep|eps)\s*\d+.*$/i,
];

// Leading streaming verbs with whitespace requirement (does NOT affect words like "Watchmen")
const LEADING_VERB_PATTERN = /^(?:watch\s+(?:online|free\s+online|free)?|nonton\s+(?:anime|streaming|gratis|film)?|streaming\s+|stream\s+|download\s+|unduh\s+)\s*/i;

/**
 * Extracts episode, season, and release year from title/heading text defensively.
 */
export function extractEpisodeAndSeason(text: string | undefined | null): { episode?: number; season?: number; year?: number } {
  if (!text || typeof text !== 'string') return {};
  const res: { episode?: number; season?: number; year?: number } = {};

  // Extract year e.g. (2023) or 2024
  const yearMatch = text.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch && yearMatch[1]) {
    const y = parseInt(yearMatch[1], 10);
    if (y >= 1900 && y <= 2100) res.year = y;
  }

  // S01E05 or Season 1 Episode 5
  const seMatch = text.match(/\b(?:season|s)\s*(\d+)\s*[-–—|:]?\s*(?:episode|ep|eps|e)\s*(\d+)\b/i);
  if (seMatch && seMatch[1] && seMatch[2]) {
    const s = parseInt(seMatch[1], 10);
    const e = parseInt(seMatch[2], 10);
    if (Number.isSafeInteger(s) && s > 0) res.season = s;
    if (Number.isSafeInteger(e) && e > 0) res.episode = e;
    return res;
  }

  const epMatch = text.match(/\b(?:episode|ep|eps|e)\.?\s*(\d+)\b/i);
  if (epMatch && epMatch[1]) {
    const e = parseInt(epMatch[1], 10);
    if (Number.isSafeInteger(e) && e > 0) res.episode = e;
  }

  const seasonMatch = text.match(/\b(?:season|s)\.?\s*(\d+)\b/i);
  if (seasonMatch && seasonMatch[1]) {
    const s = parseInt(seasonMatch[1], 10);
    if (Number.isSafeInteger(s) && s > 0) res.season = s;
  }

  return res;
}

/**
 * Cleans a title string conservatively without deleting genuine title words.
 */
export function sanitizeTitle(rawTitle: string | undefined | null): string {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return '';
  }

  let cleaned = rawTitle.replace(/\s+/g, ' ').trim();

  // Strip script tags or HTML tags if any leaked in
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  for (const pattern of STRIP_PATTERNS) {
    const matched = cleaned.replace(pattern, '').trim();
    // Only apply if the remaining string still has substantial title content (> 1 char)
    if (matched.length >= 2) {
      cleaned = matched;
    }
  }

  // Strip leading verbs (e.g. "Watch One Piece" -> "One Piece", "Nonton One Piece" -> "One Piece")
  if (LEADING_VERB_PATTERN.test(cleaned)) {
    const withoutVerb = cleaned.replace(LEADING_VERB_PATTERN, '').trim();
    if (withoutVerb.length >= 2) {
      cleaned = withoutVerb;
    }
  }

  // Remove trailing delimiters left behind
  cleaned = cleaned.replace(/[-–—|:,;]+$/, '').trim();

  // Enforce max length
  if (cleaned.length > MAX_TITLE_LENGTH) {
    cleaned = cleaned.slice(0, MAX_TITLE_LENGTH).trim();
  }

  return cleaned;
}

/**
 * Comprehensive title cleaner for search/catalog queries.
 * Strips episode numbers, video quality tags, and subtitle tags from the core title.
 */
export function cleanMediaTitle(rawTitle: string | undefined | null): string {
  if (!rawTitle || typeof rawTitle !== 'string') return '';

  let cleaned = sanitizeTitle(rawTitle);

  // Remove common video codecs & resolutions (e.g. 1080p, 720p, BluRay, Web-DL, x264, x265)
  cleaned = cleaned.replace(/\b(?:1080p|720p|480p|360p|4k|2160p|hd|fhd|uhd|bluray|bd|web-dl|webrip|hdrip|dvdrip|x264|x265|hevc|aac|10bit)\b/gi, '');

  // Remove bracketed content (e.g. [1080p], [Sub Indo], [Batch])
  cleaned = cleaned.replace(/\[[^\]]*\]/g, '');

  // Remove episode keywords in case they were in the middle: e.g. "One Piece Episode 1120"
  cleaned = cleaned.replace(/\b(?:season|s)\s*\d+\s*[-–—|:]?\s*(?:episode|ep|eps|e)\s*\d+\b/gi, '');
  cleaned = cleaned.replace(/\b(?:episode|ep|eps|e)\.?\s*\d+\b/gi, '');
  cleaned = cleaned.replace(/\b(?:season|s)\.?\s*\d+\b/gi, '');

  // Remove remaining subtitle / quality markers
  cleaned = cleaned.replace(/\b(?:sub(?:title)?\s+indo(?:nesia)?|sub\s+indo|english\s+sub(?:bed)?|eng\s+sub|raw|dub(?:bed)?|full\s+movie|movie\s+lengkap|terbaru|gratis)\b/gi, '');

  // Remove non-year parentheses: e.g. "(Full Movie)" but keep "(2023)"
  cleaned = cleaned.replace(/\((?!(?:19\d\d|20\d\d)\))[^)]*\)/g, '');

  // Clean trailing/leading delimiters and whitespace
  cleaned = cleaned.replace(/^[-–—|/•~_:,;]+/, '').replace(/[-–—|/•~_:,;]+$/, '').replace(/\s+/g, ' ').trim();

  // If cleaning resulted in too short string (< 2 chars), fallback to sanitized title
  return cleaned.length >= 2 ? cleaned : sanitizeTitle(rawTitle);
}

export interface ExtractedJsonLd {
  title?: string;
  mediaType?: 'movie' | 'series';
  episodeNumber?: number;
  seasonNumber?: number;
}

/**
 * Safely parses JSON-LD blocks from a document or pre-extracted array.
 * Strictly defensive: checks sizes, catches errors, never runs scripts.
 */
export function extractJsonLdMetadata(
  input: Document | unknown[]
): ExtractedJsonLd | null {
  const blocks: unknown[] = [];

  if (Array.isArray(input)) {
    blocks.push(...input);
  } else if (typeof input === 'object' && input !== null && 'querySelectorAll' in input) {
    try {
      const scriptElements = (input as Document).querySelectorAll('script[type="application/ld+json"]');
      for (let i = 0; i < scriptElements.length && i < 10; i++) {
        const el = scriptElements[i];
        const text = el?.textContent || '';
        if (text.length > 0 && text.length <= MAX_JSON_LD_CHARS) {
          try {
            const parsed = JSON.parse(text);
            blocks.push(parsed);
          } catch {
            // Ignore malformed JSON-LD block
          }
        }
      }
    } catch {
      // DOM access failure
    }
  }

  for (const block of blocks) {
    const candidate = parseSchemaObject(block);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function parseSchemaObject(data: unknown): ExtractedJsonLd | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Handle @graph container
  if ('@graph' in data && Array.isArray((data as Record<string, unknown>)['@graph'])) {
    const graph = (data as Record<string, unknown>)['@graph'] as unknown[];
    for (const item of graph) {
      const parsed = parseSchemaObject(item);
      if (parsed) return parsed;
    }
    return null;
  }

  const obj = data as Record<string, unknown>;
  const type = String(obj['@type'] || '');

  // 1. TVEpisode
  if (type.includes('TVEpisode') || type === 'Episode') {
    const name = typeof obj.name === 'string' ? obj.name : undefined;
    const seriesObj = typeof obj.partOfSeries === 'object' && obj.partOfSeries !== null
      ? (obj.partOfSeries as Record<string, unknown>)
      : undefined;
    const seriesName = seriesObj && typeof seriesObj.name === 'string' ? seriesObj.name : undefined;
    const rawEp = obj.episodeNumber;
    const epNum = typeof rawEp === 'number' ? rawEp : typeof rawEp === 'string' ? parseInt(rawEp, 10) : undefined;
    const rawSeason = obj.seasonNumber;
    const seasonNum = typeof rawSeason === 'number' ? rawSeason : typeof rawSeason === 'string' ? parseInt(rawSeason, 10) : undefined;

    const chosenTitle = seriesName || name;
    if (chosenTitle) {
      return {
        title: sanitizeTitle(chosenTitle),
        mediaType: 'series',
        episodeNumber: Number.isSafeInteger(epNum) && (epNum ?? 0) > 0 ? epNum : undefined,
        seasonNumber: Number.isSafeInteger(seasonNum) && (seasonNum ?? 0) > 0 ? seasonNum : undefined,
      };
    }
  }

  // 2. TVSeries
  if (type.includes('TVSeries') || type === 'Series') {
    const name = typeof obj.name === 'string' ? obj.name : undefined;
    if (name) {
      return {
        title: sanitizeTitle(name),
        mediaType: 'series',
      };
    }
  }

  // 3. Movie
  if (type.includes('Movie')) {
    const name = typeof obj.name === 'string' ? obj.name : undefined;
    if (name) {
      return {
        title: sanitizeTitle(name),
        mediaType: 'movie',
      };
    }
  }

  // 4. VideoObject
  if (type.includes('VideoObject')) {
    const name = typeof obj.name === 'string' ? obj.name : undefined;
    if (name) {
      return {
        title: sanitizeTitle(name),
      };
    }
  }

  return null;
}

/**
 * Extracts Open Graph title and type safely from document meta tags.
 */
export function extractOpenGraphMetadata(
  doc: Document
): { title?: string; mediaType?: 'movie' | 'series'; ogType?: string } {
  try {
    const ogTitleEl =
      doc.querySelector('meta[property="og:title"]') ||
      doc.querySelector('meta[name="og:title"]');
    const ogTypeEl =
      doc.querySelector('meta[property="og:type"]') ||
      doc.querySelector('meta[name="og:type"]');

    const rawTitle = ogTitleEl?.getAttribute('content') || undefined;
    const ogType = ogTypeEl?.getAttribute('content')?.toLowerCase() || undefined;

    let mediaType: 'movie' | 'series' | undefined;
    if (ogType) {
      if (ogType.includes('movie')) {
        mediaType = 'movie';
      } else if (ogType.includes('tv_show') || ogType.includes('episode') || ogType.includes('series')) {
        mediaType = 'series';
      }
    }

    return {
      title: rawTitle ? sanitizeTitle(rawTitle) : undefined,
      mediaType,
      ogType,
    };
  } catch {
    return {};
  }
}

/**
 * Safely extracts the primary page heading (first h1) without reading private sections.
 */
export function extractMainHeading(doc: Document): string | null {
  try {
    const h1 = doc.querySelector('h1');
    if (!h1) return null;

    const text = h1.textContent?.trim();
    if (!text || text.length === 0) return null;

    const cleaned = sanitizeTitle(text);
    return cleaned.length >= 2 ? cleaned : null;
  } catch {
    return null;
  }
}
