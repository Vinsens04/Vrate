import 'server-only';

import type { CatalogMedia } from '../../types/catalog-types';
import {
  mapTmdbMovieDetailToCatalogMedia,
  mapTmdbSearchItemToCatalogMedia,
  mapTmdbTvDetailToCatalogMedia,
} from './mapper';
import {
  tmdbMovieDetailResponseSchema,
  tmdbMultiSearchResponseSchema,
  tmdbTvDetailResponseSchema,
} from './schemas';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Checks if TMDB API read token is configured in server environment.
 * Does not expose the token value.
 */
export function isTmdbConfigured(): boolean {
  const token = process.env.TMDB_API_READ_TOKEN;
  return Boolean(token && token.trim().length > 0);
}

function getTmdbToken(): string {
  const token = process.env.TMDB_API_READ_TOKEN;
  if (!token || !token.trim()) {
    throw new Error('Layanan TMDB belum dikonfigurasi (TMDB_API_READ_TOKEN belum diatur).');
  }
  return token.trim();
}

/**
 * Robust fetch with timeout, retry for 429/5xx, and redaction of credentials.
 */
async function fetchTmdbWithRetry(
  endpoint: string,
  params: Record<string, string | number> = {},
  options: { revalidate?: number } = { revalidate: 3600 }
): Promise<Response> {
  const token = getTmdbToken();
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const maxAttempts = 2;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        next: options.revalidate !== undefined ? { revalidate: options.revalidate } : undefined,
      });

      // If rate limited or server error, retry once if attempts remaining
      if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }

      return response;
    } catch (err: unknown) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }

  if (lastError instanceof Error && lastError.name === 'TimeoutError') {
    throw new Error('Permintaan ke TMDB melebihi batas waktu (timeout).');
  }

  throw new Error('Gagal terhubung ke layanan TMDB.');
}

/**
 * Searches TMDB for movies and TV shows via multi-search.
 */
export async function searchTmdb(
  query: string,
  page: number = 1
): Promise<{
  available: boolean;
  hasNextPage: boolean;
  results: CatalogMedia[];
  error?: string;
}> {
  if (!isTmdbConfigured()) {
    return {
      available: false,
      hasNextPage: false,
      results: [],
      error: 'TMDB API token belum dikonfigurasi.',
    };
  }

  try {
    const response = await fetchTmdbWithRetry(
      '/search/multi',
      {
        query,
        page,
        language: 'id-ID',
        include_adult: 'false',
      },
      { revalidate: 300 } // 5 minutes cache for search
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          available: false,
          hasNextPage: false,
          results: [],
          error: 'Autentikasi TMDB gagal. Periksa token TMDB Anda.',
        };
      }
      return {
        available: false,
        hasNextPage: false,
        results: [],
        error: `Layanan TMDB mengembalikan status ${response.status}.`,
      };
    }

    const json = await response.json();
    const parsed = tmdbMultiSearchResponseSchema.safeParse(json);

    if (!parsed.success) {
      return {
        available: false,
        hasNextPage: false,
        results: [],
        error: 'Format data respon TMDB tidak sesuai.',
      };
    }

    const items = parsed.data.results
      .map(mapTmdbSearchItemToCatalogMedia)
      .filter((m): m is CatalogMedia => m !== null);

    const hasNextPage = parsed.data.page < parsed.data.total_pages;

    return {
      available: true,
      hasNextPage,
      results: items,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memanggil TMDB.';
    return {
      available: false,
      hasNextPage: false,
      results: [],
      error: message,
    };
  }
}

/**
 * Retrieves full details for a TMDB movie.
 */
export async function getTmdbMovieDetail(id: number | string): Promise<CatalogMedia> {
  const numericId = typeof id === 'number' ? id : parseInt(id, 10);
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error('ID film TMDB tidak valid.');
  }

  const response = await fetchTmdbWithRetry(`/movie/${numericId}`, {
    language: 'id-ID',
  });

  if (response.status === 404) {
    throw new Error('Film tidak ditemukan di TMDB.');
  }

  if (!response.ok) {
    throw new Error(`Gagal mengambil detail film dari TMDB (status ${response.status}).`);
  }

  const json = await response.json();
  const parsed = tmdbMovieDetailResponseSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error('Format respon detail film TMDB tidak valid.');
  }

  let movieData = parsed.data;

  // Fallback to en-US overview if id-ID overview is completely empty
  if (!movieData.overview || !movieData.overview.trim()) {
    try {
      const enRes = await fetchTmdbWithRetry(`/movie/${numericId}`, {
        language: 'en-US',
      });
      if (enRes.ok) {
        const enJson = await enRes.json();
        const enParsed = tmdbMovieDetailResponseSchema.safeParse(enJson);
        if (enParsed.success && enParsed.data.overview) {
          movieData = { ...movieData, overview: enParsed.data.overview };
        }
      }
    } catch {
      // Non-fatal, fallback to whatever we have
    }
  }

  return mapTmdbMovieDetailToCatalogMedia(movieData);
}

/**
 * Retrieves full details for a TMDB TV series.
 */
export async function getTmdbTvDetail(id: number | string): Promise<CatalogMedia> {
  const numericId = typeof id === 'number' ? id : parseInt(id, 10);
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error('ID serial TMDB tidak valid.');
  }

  const response = await fetchTmdbWithRetry(`/tv/${numericId}`, {
    language: 'id-ID',
  });

  if (response.status === 404) {
    throw new Error('Serial TV tidak ditemukan di TMDB.');
  }

  if (!response.ok) {
    throw new Error(`Gagal mengambil detail serial dari TMDB (status ${response.status}).`);
  }

  const json = await response.json();
  const parsed = tmdbTvDetailResponseSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error('Format respon detail serial TMDB tidak valid.');
  }

  let tvData = parsed.data;

  // Fallback to en-US overview if id-ID overview is completely empty
  if (!tvData.overview || !tvData.overview.trim()) {
    try {
      const enRes = await fetchTmdbWithRetry(`/tv/${numericId}`, {
        language: 'en-US',
      });
      if (enRes.ok) {
        const enJson = await enRes.json();
        const enParsed = tmdbTvDetailResponseSchema.safeParse(enJson);
        if (enParsed.success && enParsed.data.overview) {
          tvData = { ...tvData, overview: enParsed.data.overview };
        }
      }
    } catch {
      // Non-fatal, fallback
    }
  }

  return mapTmdbTvDetailToCatalogMedia(tvData);
}
