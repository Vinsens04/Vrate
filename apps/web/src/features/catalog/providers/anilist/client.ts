import 'server-only';

import type { CatalogMedia } from '../../types/catalog-types';
import { mapAniListMediaToCatalogMedia } from './mapper';
import { ANILIST_DETAIL_QUERY, ANILIST_SEARCH_QUERY } from './queries';
import {
  anilistDetailResponseSchema,
  anilistSearchResponseSchema,
} from './schemas';
import { isAllowedImageUrl, sanitizeOverview } from '../../utils/image-urls';

const REQUEST_TIMEOUT_MS = 8000;

function getAniListUrl(): string {
  return process.env.ANILIST_API_URL || 'https://graphql.anilist.co';
}

/**
 * Sends a GraphQL query to AniList with retries for rate limits or server errors.
 */
async function fetchAniListGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
  options: { revalidate?: number } = { revalidate: 3600 }
): Promise<T> {
  const url = getAniListUrl();
  const maxAttempts = 2;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'Vrate/0.1.0 (https://vrate.app)',
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        next: options.revalidate !== undefined ? { revalidate: options.revalidate } : undefined,
      });

      if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }

      if (!response.ok) {
        // Try parsing GraphQL error response from AniList
        try {
          const errJson = await response.json();
          if (errJson && (errJson.errors || errJson.data)) {
            return errJson as T;
          }
        } catch {
          // fallback to throwing HTTP status error below
        }
        throw new Error(`AniList GraphQL mengembalikan status HTTP ${response.status}.`);
      }

      const json = await response.json();
      return json as T;
    } catch (err: unknown) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }

  if (lastError instanceof Error && lastError.name === 'TimeoutError') {
    throw new Error('Request to AniList timed out.');
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Failed to connect to AniList service.');
}

/**
 * Fallback helper to search anime from Kitsu cross-referenced with AniList IDs (via Fribb)
 * when AniList API is offline or experiencing outages.
 */
async function searchAnimeFallback(
  query: string,
  page: number = 1,
  perPage: number = 20
): Promise<{
  available: boolean;
  hasNextPage: boolean;
  results: CatalogMedia[];
  error?: string;
}> {
  try {
    const offset = Math.max(0, (page - 1) * perPage);
    const kitsuUrl = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=${perPage}&page[offset]=${offset}`;

    const [kitsuRes, fribbList] = await Promise.all([
      fetch(kitsuUrl, {
        headers: { Accept: 'application/vnd.api+json' },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(5000),
      }),
      fetch('https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json', {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(5000),
      })
        .then(async (r) =>
          r.ok ? ((await r.json()) as Array<{ kitsu_id?: number; anilist_id?: number }>) : []
        )
        .catch(() => []),
    ]);

    if (!kitsuRes.ok) {
      return { available: false, hasNextPage: false, results: [] };
    }

    const kitsuData = (await kitsuRes.json()) as {
      data?: Array<{
        id: string;
        attributes: {
          canonicalTitle?: string;
          titles?: { en?: string; ja_jp?: string };
          synopsis?: string;
          subtype?: string;
          startDate?: string;
          episodeCount?: number;
          averageRating?: string;
          status?: string;
          posterImage?: { small?: string; large?: string; original?: string };
        };
      }>;
      links?: { next?: string };
    };

    const kitsuMap = new Map<number, number>();
    for (const item of fribbList) {
      if (item.kitsu_id && item.anilist_id) {
        kitsuMap.set(item.kitsu_id, item.anilist_id);
      }
    }

    const results: CatalogMedia[] = (kitsuData.data || []).map((item) => {
      const kId = parseInt(item.id, 10);
      const anilistId = kitsuMap.get(kId) || kId;
      const attr = item.attributes;
      const isMovie = attr.subtype?.toLowerCase() === 'movie';
      const rawPoster =
        attr.posterImage?.large || attr.posterImage?.small || attr.posterImage?.original || null;
      const posterUrl = isAllowedImageUrl(rawPoster) ? rawPoster : null;
      const releaseDate = attr.startDate || null;
      const releaseYear = releaseDate ? parseInt(releaseDate.split('-')[0], 10) : null;
      const rating = attr.averageRating ? Math.round(parseFloat(attr.averageRating)) : null;

      return {
        provider: 'anilist',
        externalId: String(anilistId),
        mediaType: isMovie ? 'movie' : 'series',
        category: 'anime',
        title: attr.titles?.en || attr.canonicalTitle || 'Anime',
        originalTitle: attr.titles?.ja_jp || null,
        overview: sanitizeOverview(attr.synopsis),
        posterUrl,
        backdropUrl: null,
        releaseDate,
        releaseYear: isNaN(releaseYear as number) ? null : releaseYear,
        runtimeMinutes: null,
        totalSeasons: null,
        totalEpisodes: typeof attr.episodeCount === 'number' ? attr.episodeCount : null,
        genres: [],
        providerRating: rating,
        providerRatingLabel: rating ? `${rating}% AniList` : 'AniList',
        adult: false,
        status: attr.status || null,
      };
    });

    return {
      available: true,
      hasNextPage: Boolean(kitsuData.links?.next),
      results,
    };
  } catch {
    return { available: false, hasNextPage: false, results: [] };
  }
}

/**
 * Searches AniList anime catalog with automatic fallback to Kitsu / MAL if AniList is down.
 */
export async function searchAniList(
  query: string,
  page: number = 1,
  perPage: number = 20
): Promise<{
  available: boolean;
  hasNextPage: boolean;
  results: CatalogMedia[];
  error?: string;
}> {
  try {
    const rawJson = await fetchAniListGraphQL(
      ANILIST_SEARCH_QUERY,
      { search: query, page, perPage },
      { revalidate: 300 } // 5 minutes cache for search
    );

    const parsed = anilistSearchResponseSchema.safeParse(rawJson);
    if (!parsed.success) {
      const fallback = await searchAnimeFallback(query, page, perPage);
      if (fallback.results.length > 0) return fallback;

      return {
        available: false,
        hasNextPage: false,
        results: [],
        error: 'Invalid AniList response data format.',
      };
    }

    if (parsed.data.errors && parsed.data.errors.length > 0) {
      // AniList returned errors (e.g. "The AniList API has been temporarily disabled due to severe stability issues.")
      const fallback = await searchAnimeFallback(query, page, perPage);
      if (fallback.results.length > 0) return fallback;

      const firstError = parsed.data.errors[0]?.message || 'AniList GraphQL error.';
      return {
        available: false,
        hasNextPage: false,
        results: [],
        error: firstError,
      };
    }

    const pageData = parsed.data.data?.Page;
    const mediaList = pageData?.media || [];
    const items = mediaList
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map(mapAniListMediaToCatalogMedia)
      .filter((m): m is CatalogMedia => m !== null);

    const hasNextPage = Boolean(pageData?.pageInfo?.hasNextPage);

    return {
      available: true,
      hasNextPage,
      results: items,
    };
  } catch (err: unknown) {
    // Network or HTTP status error (e.g. 403 Forbidden, 500, timeout)
    const fallback = await searchAnimeFallback(query, page, perPage);
    if (fallback.results.length > 0) return fallback;

    const message =
      err instanceof Error ? err.message : 'Terjadi kesalahan saat mencari anime di AniList.';
    return {
      available: false,
      hasNextPage: false,
      results: [],
      error: message,
    };
  }
}

/**
 * Fallback helper to fetch anime details from MyAnimeList (via Jikan & Fribb cross-reference mapping)
 * when AniList API is offline or experiencing outages.
 */
async function fetchMalFallbackDetail(anilistId: number): Promise<CatalogMedia | null> {
  try {
    const mapRes = await fetch(
      'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json',
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) }
    );
    if (!mapRes.ok) return null;
    const list = (await mapRes.json()) as Array<{ anilist_id?: number; mal_id?: number }>;
    const match = list.find((x) => x.anilist_id === anilistId);
    if (!match || !match.mal_id) return null;

    const jikanRes = await fetch(`https://api.jikan.moe/v4/anime/${match.mal_id}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!jikanRes.ok) return null;
    const jikanData = await jikanRes.json();
    const item = jikanData.data;
    if (!item) return null;

    const isMovie = item.type === 'Movie';
    const rawPoster =
      item.images?.jpg?.large_image_url ||
      item.images?.webp?.large_image_url ||
      item.images?.jpg?.image_url ||
      null;

    const posterUrl = isAllowedImageUrl(rawPoster) ? rawPoster : null;
    const releaseDate = item.aired?.from ? item.aired.from.split('T')[0] : null;
    const releaseYear = item.year || (releaseDate ? parseInt(releaseDate.split('-')[0], 10) : null);

    return {
      provider: 'anilist',
      externalId: String(anilistId),
      mediaType: isMovie ? 'movie' : 'series',
      category: 'anime',
      title: item.title || item.title_english || 'Anime',
      originalTitle: item.title_japanese || null,
      overview: item.synopsis || null,
      posterUrl,
      backdropUrl: null,
      releaseDate,
      releaseYear,
      runtimeMinutes: null,
      totalSeasons: null,
      totalEpisodes: typeof item.episodes === 'number' ? item.episodes : null,
      genres: Array.isArray(item.genres) ? item.genres.map((g: any) => g.name).filter(Boolean) : [],
      providerRating: typeof item.score === 'number' ? Number(item.score.toFixed(1)) : null,
      providerRatingLabel: typeof item.score === 'number' ? `${item.score} MAL` : 'MyAnimeList',
      adult: Boolean(item.rating?.includes('Rx')),
      status: item.status || null,
    };
  } catch {
    return null;
  }
}

/**
 * Fallback helper to fetch anime details from Kitsu (via Fribb cross-reference mapping)
 * if both AniList and MyAnimeList are unreachable.
 */
async function fetchKitsuFallbackDetail(anilistId: number): Promise<CatalogMedia | null> {
  try {
    const mapRes = await fetch(
      'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json',
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) }
    );
    if (!mapRes.ok) return null;
    const list = (await mapRes.json()) as Array<{ anilist_id?: number; kitsu_id?: number }>;
    const match = list.find((x) => x.anilist_id === anilistId);
    if (!match || !match.kitsu_id) return null;

    const kitsuRes = await fetch(`https://kitsu.io/api/edge/anime/${match.kitsu_id}`, {
      headers: { Accept: 'application/vnd.api+json' },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!kitsuRes.ok) return null;
    const json = (await kitsuRes.json()) as {
      data?: {
        id: string;
        attributes: {
          canonicalTitle?: string;
          titles?: { en?: string; ja_jp?: string };
          synopsis?: string;
          subtype?: string;
          startDate?: string;
          episodeCount?: number;
          averageRating?: string;
          status?: string;
          posterImage?: { small?: string; large?: string; original?: string };
        };
      };
    };

    const item = json.data;
    if (!item) return null;

    const attr = item.attributes;
    const isMovie = attr.subtype?.toLowerCase() === 'movie';
    const rawPoster =
      attr.posterImage?.large || attr.posterImage?.small || attr.posterImage?.original || null;
    const posterUrl = isAllowedImageUrl(rawPoster) ? rawPoster : null;
    const releaseDate = attr.startDate || null;
    const releaseYear = releaseDate ? parseInt(releaseDate.split('-')[0], 10) : null;
    const rating = attr.averageRating ? Math.round(parseFloat(attr.averageRating)) : null;

    return {
      provider: 'anilist',
      externalId: String(anilistId),
      mediaType: isMovie ? 'movie' : 'series',
      category: 'anime',
      title: attr.titles?.en || attr.canonicalTitle || 'Anime',
      originalTitle: attr.titles?.ja_jp || null,
      overview: sanitizeOverview(attr.synopsis),
      posterUrl,
      backdropUrl: null,
      releaseDate,
      releaseYear: isNaN(releaseYear as number) ? null : releaseYear,
      runtimeMinutes: null,
      totalSeasons: null,
      totalEpisodes: typeof attr.episodeCount === 'number' ? attr.episodeCount : null,
      genres: [],
      providerRating: rating,
      providerRatingLabel: rating ? `${rating}% AniList` : 'AniList',
      adult: false,
      status: attr.status || null,
    };
  } catch {
    return null;
  }
}

/**
 * Retrieves full details for an AniList anime by integer ID.
 * Falls back seamlessly to MyAnimeList, then Kitsu if the AniList upstream API is unreachable.
 */
export async function getAniListDetail(id: number | string): Promise<CatalogMedia> {
  const numericId = typeof id === 'number' ? id : parseInt(id, 10);
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error('Invalid AniList anime ID.');
  }

  try {
    const rawJson = await fetchAniListGraphQL(
      ANILIST_DETAIL_QUERY,
      { id: numericId },
      { revalidate: 86400 } // 24 hours cache for detail
    );

    const parsed = anilistDetailResponseSchema.safeParse(rawJson);
    if (parsed.success && !parsed.data.errors?.length && parsed.data.data?.Media) {
      const mapped = mapAniListMediaToCatalogMedia(parsed.data.data.Media);
      if (mapped) return mapped;
    }
  } catch {
    // AniList API unreachable or 403, proceed to fallbacks below
  }

  // Multi-tier graceful fallback: MyAnimeList -> Kitsu
  const malFallback = await fetchMalFallbackDetail(numericId);
  if (malFallback) {
    return malFallback;
  }

  const kitsuFallback = await fetchKitsuFallbackDetail(numericId);
  if (kitsuFallback) {
    return kitsuFallback;
  }

  throw new Error('Failed to load anime details from AniList or fallback sources.');
}
