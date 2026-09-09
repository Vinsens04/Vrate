import type {
  CatalogFilterType,
  CatalogMedia,
  CatalogSource,
  InitialLibraryStatus,
} from '../types/catalog-types';

export function parseCatalogFilter(value?: string | null): CatalogFilterType {
  if (!value) return 'all';
  const v = value.toLowerCase().trim();
  if (v === 'movie') return 'movie';
  if (v === 'series') return 'series';
  if (v === 'anime') return 'anime';
  return 'all';
}

export function parseCatalogSource(value?: string | null): CatalogSource {
  if (!value) return 'all';
  const v = value.toLowerCase().trim();
  if (v === 'tmdb') return 'tmdb';
  if (v === 'anilist') return 'anilist';
  return 'all';
}

export function parseCatalogPage(value?: string | null): number {
  if (!value) return 1;
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1) return 1;
  if (num > 50) return 50;
  return num;
}

export function buildDiscoverUrl(
  basePath: string,
  currentParams: { q?: string; source?: string; type?: string; page?: string | number },
  updates: { q?: string; source?: string; type?: string; page?: string | number }
): string {
  const merged = { ...currentParams, ...updates };
  const searchParams = new URLSearchParams();

  if (merged.q && merged.q.trim().length > 0) {
    searchParams.set('q', merged.q.trim());
  }

  if (merged.source && merged.source !== 'all') {
    searchParams.set('source', merged.source);
  }

  if (merged.type && merged.type !== 'all') {
    searchParams.set('type', merged.type);
  }

  const page = typeof merged.page === 'number' ? merged.page : parseInt(String(merged.page || '1'), 10);
  if (page && page > 1) {
    searchParams.set('page', String(page));
  }

  const qs = searchParams.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Calculates started_at and completed_at based on initial status choice.
 * Does not set last_watched_at (manual library addition).
 */
export function calculateInitialStatusDates(
  status: InitialLibraryStatus,
  nowIso: string = new Date().toISOString()
): { startedAt: string | null; completedAt: string | null } {
  switch (status) {
    case 'watchlist':
      return { startedAt: null, completedAt: null };
    case 'watching':
      return { startedAt: nowIso, completedAt: null };
    case 'completed':
      return { startedAt: nowIso, completedAt: nowIso };
  }
}

/**
 * Formats provider rating with descriptive label.
 */
export function formatProviderScore(media: Pick<CatalogMedia, 'provider' | 'providerRating'>): string {
  if (media.providerRating === null || media.providerRating === undefined) {
    return media.provider === 'tmdb' ? 'TMDB' : 'AniList';
  }

  if (media.provider === 'anilist') {
    // Score is 0-10 normalized, raw averageScore was * 10
    const percent = Math.round(media.providerRating * 10);
    return `${percent}% AniList`;
  }

  return `${media.providerRating.toFixed(1)}/10 TMDB`;
}
