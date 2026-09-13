import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { getAniListDetail, searchAniList } from '../providers/anilist/client';
import {
  getTmdbMovieDetail,
  getTmdbTvDetail,
  isTmdbConfigured,
  searchTmdb,
} from '../providers/tmdb/client';
import type {
  CatalogFilterType,
  CatalogMedia,
  CatalogSearchResult,
  CatalogSource,
  ProviderStatusInfo,
} from '../types/catalog-types';

/**
 * Enriches normalized catalog items with user's library status.
 * Uses authenticated server client respecting RLS.
 */
export async function enrichWithUserLibraryStatus(
  items: CatalogMedia[]
): Promise<CatalogMedia[]> {
  if (items.length === 0) return items;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return items;

    // Collect external IDs to check
    const externalIds = items.map((i) => i.externalId);

    // Look up in media_external_ids
    const { data: externalMappings, error: mapErr } = await supabase
      .from('media_external_ids')
      .select('media_id, provider, external_id')
      .in('external_id', externalIds);

    if (mapErr || !externalMappings || externalMappings.length === 0) {
      return items;
    }

    // Build lookup key: `${provider}:${external_id}` -> media_id
    const providerMap = new Map<string, string>();
    const mediaIds: string[] = [];
    for (const row of externalMappings) {
      providerMap.set(`${row.provider}:${row.external_id}`, row.media_id);
      mediaIds.push(row.media_id);
    }

    if (mediaIds.length === 0) return items;

    // Look up in user's library_entries
    const { data: userEntries, error: entryErr } = await supabase
      .from('library_entries')
      .select('id, media_id, status')
      .in('media_id', mediaIds);

    if (entryErr || !userEntries || userEntries.length === 0) {
      return items;
    }

    // Lookup map: media_id -> user entry
    const entryMap = new Map<string, { id: string; status: string }>();
    for (const entry of userEntries) {
      entryMap.set(entry.media_id, { id: entry.id, status: entry.status });
    }

    return items.map((item) => {
      const mediaId = providerMap.get(`${item.provider}:${item.externalId}`);
      if (mediaId && entryMap.has(mediaId)) {
        const found = entryMap.get(mediaId)!;
        return {
          ...item,
          inLibrary: true,
          libraryEntryId: found.id,
          libraryStatus: found.status as any,
        };
      }
      return {
        ...item,
        inLibrary: false,
        libraryEntryId: null,
        libraryStatus: null,
      };
    });
  } catch {
    // If enrichment fails, return items without throwing
    return items;
  }
}

/**
 * Executes a federated catalog search combining TMDB and AniList.
 */
export async function executeCatalogSearch({
  query,
  source = 'all',
  filterType = 'all',
  page = 1,
}: {
  query: string;
  source?: CatalogSource;
  filterType?: CatalogFilterType;
  page?: number;
}): Promise<CatalogSearchResult> {
  const tmdbStatus: ProviderStatusInfo = {
    configured: isTmdbConfigured(),
    available: false,
    hasNextPage: false,
    error: null,
  };

  const anilistStatus: ProviderStatusInfo = {
    configured: true,
    available: false,
    hasNextPage: false,
    error: null,
  };

  // Determine which providers to query
  const shouldQueryTmdb =
    (source === 'all' || source === 'tmdb') &&
    filterType !== 'anime' &&
    tmdbStatus.configured;

  const shouldQueryAniList =
    (source === 'all' || source === 'anilist') &&
    filterType !== 'movie' &&
    filterType !== 'series';

  // Even if filterType is movie or series, anime could also be movie/series,
  // but if source is 'all' and filter is movie/series, AniList can still contribute if user didn't explicitly pick tmdb
  const allowAniListForType =
    (source === 'all' || source === 'anilist') &&
    (filterType === 'all' || filterType === 'anime' || filterType === 'movie' || filterType === 'series');

  const promises: [
    Promise<Awaited<ReturnType<typeof searchTmdb>>> | null,
    Promise<Awaited<ReturnType<typeof searchAniList>>> | null,
  ] = [
    shouldQueryTmdb ? searchTmdb(query, page) : null,
    allowAniListForType ? searchAniList(query, page) : null,
  ];

  const [tmdbResult, anilistResult] = await Promise.allSettled([
    promises[0] ?? Promise.resolve(null),
    promises[1] ?? Promise.resolve(null),
  ]);

  let tmdbItems: CatalogMedia[] = [];
  if (tmdbResult.status === 'fulfilled' && tmdbResult.value) {
    const val = tmdbResult.value;
    tmdbStatus.available = val.available;
    tmdbStatus.hasNextPage = val.hasNextPage;
    tmdbStatus.error = val.error || null;
    tmdbItems = val.results;
  } else if (tmdbResult.status === 'rejected') {
    tmdbStatus.available = false;
    tmdbStatus.error = tmdbResult.reason instanceof Error ? tmdbResult.reason.message : 'TMDB failed to respond.';
  } else if (!tmdbStatus.configured && (source === 'all' || source === 'tmdb')) {
    tmdbStatus.error = 'TMDB API token is not configured.';
  }

  let anilistItems: CatalogMedia[] = [];
  if (anilistResult.status === 'fulfilled' && anilistResult.value) {
    const val = anilistResult.value;
    anilistStatus.available = val.available;
    anilistStatus.hasNextPage = val.hasNextPage;
    anilistStatus.error = val.error || null;
    anilistItems = val.results;
  } else if (anilistResult.status === 'rejected') {
    anilistStatus.available = false;
    anilistStatus.error = anilistResult.reason instanceof Error ? anilistResult.reason.message : 'AniList failed to respond.';
  }

  // Filter based on filterType
  let filteredTmdb = tmdbItems;
  if (filterType === 'movie') {
    filteredTmdb = filteredTmdb.filter((m) => m.mediaType === 'movie');
  } else if (filterType === 'series') {
    filteredTmdb = filteredTmdb.filter((m) => m.mediaType === 'series');
  } else if (filterType === 'anime') {
    filteredTmdb = [];
  }

  let filteredAniList = anilistItems;
  if (filterType === 'movie') {
    filteredAniList = filteredAniList.filter((m) => m.mediaType === 'movie');
  } else if (filterType === 'series') {
    filteredAniList = filteredAniList.filter((m) => m.mediaType === 'series');
  } else if (filterType === 'anime') {
    filteredAniList = filteredAniList.filter((m) => m.category === 'anime');
  }

  // Merge and interleave results
  const merged: CatalogMedia[] = [];
  const maxLen = Math.max(filteredTmdb.length, filteredAniList.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < filteredTmdb.length) {
      merged.push(filteredTmdb[i]);
    }
    if (i < filteredAniList.length) {
      merged.push(filteredAniList[i]);
    }
  }

  // Enrich with user library status
  const enrichedResults = await enrichWithUserLibraryStatus(merged);

  return {
    results: enrichedResults,
    page,
    query,
    source,
    filterType,
    providers: {
      tmdb: tmdbStatus,
      anilist: anilistStatus,
    },
  };
}

/**
 * Retrieves detailed catalog information from the provider and enriches with library status.
 */
export async function getCatalogMediaDetail({
  provider,
  externalId,
  providerMediaType,
}: {
  provider: 'tmdb' | 'anilist';
  externalId: string;
  providerMediaType?: 'movie' | 'tv';
}): Promise<CatalogMedia> {
  let media: CatalogMedia;

  if (provider === 'tmdb') {
    if (providerMediaType === 'tv') {
      media = await getTmdbTvDetail(externalId);
    } else {
      media = await getTmdbMovieDetail(externalId);
    }
  } else if (provider === 'anilist') {
    media = await getAniListDetail(externalId);
  } else {
    throw new Error(`Provider tidak dikenal: ${provider}`);
  }

  const [enriched] = await enrichWithUserLibraryStatus([media]);
  return enriched || media;
}
