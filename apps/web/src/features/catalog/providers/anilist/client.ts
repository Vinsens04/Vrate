import 'server-only';

import type { CatalogMedia } from '../../types/catalog-types';
import { mapAniListMediaToCatalogMedia } from './mapper';
import { ANILIST_DETAIL_QUERY, ANILIST_SEARCH_QUERY } from './queries';
import {
  anilistDetailResponseSchema,
  anilistSearchResponseSchema,
} from './schemas';

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
    throw new Error('Permintaan ke AniList melebihi batas waktu (timeout).');
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Gagal terhubung ke layanan AniList.');
}

/**
 * Searches AniList anime catalog.
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
      return {
        available: false,
        hasNextPage: false,
        results: [],
        error: 'Format data respon AniList tidak valid.',
      };
    }

    if (parsed.data.errors && parsed.data.errors.length > 0) {
      const firstError = parsed.data.errors[0]?.message || 'Kesalahan GraphQL AniList.';
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
 * Retrieves full details for an AniList anime by integer ID.
 */
export async function getAniListDetail(id: number | string): Promise<CatalogMedia> {
  const numericId = typeof id === 'number' ? id : parseInt(id, 10);
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error('ID anime AniList tidak valid.');
  }

  const rawJson = await fetchAniListGraphQL(
    ANILIST_DETAIL_QUERY,
    { id: numericId },
    { revalidate: 86400 } // 24 hours cache for detail
  );

  const parsed = anilistDetailResponseSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new Error('Format data respon detail AniList tidak valid.');
  }

  if (parsed.data.errors && parsed.data.errors.length > 0) {
    const firstError = parsed.data.errors[0]?.message || 'Kesalahan GraphQL AniList.';
    throw new Error(`Gagal memuat anime: ${firstError}`);
  }

  const mediaItem = parsed.data.data?.Media;
  if (!mediaItem) {
    throw new Error('Anime tidak ditemukan di AniList.');
  }

  const mapped = mapAniListMediaToCatalogMedia(mediaItem);
  if (!mapped) {
    throw new Error('Data anime tidak memenuhi kriteria katalog.');
  }

  return mapped;
}
