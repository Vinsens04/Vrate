import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type {
  DashboardSummary,
  EpisodeProgressItem,
  LibraryEntryItem,
  PaginatedLibraryResult,
  SortOption,
  WatchSessionItem,
} from '../types/library-types';
import { mapDbEntryToViewModel } from '../utils/library-logic';
import type { LibraryStatus } from '@vrate/shared';

/**
 * Fetches dashboard summary counts for the authenticated user.
 */
export async function getDashboardSummary(): Promise<DashboardSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('library_entries')
    .select('status')
    .eq('user_id', user.id);

  if (error || !data) {
    console.error('Error fetching dashboard summary:', error?.message);
    return {
      totalCount: 0,
      watchlistCount: 0,
      watchingCount: 0,
      completedCount: 0,
      pausedCount: 0,
      droppedCount: 0,
    };
  }

  const summary: DashboardSummary = {
    totalCount: data.length,
    watchlistCount: 0,
    watchingCount: 0,
    completedCount: 0,
    pausedCount: 0,
    droppedCount: 0,
  };

  for (const entry of data) {
    switch (entry.status) {
      case 'watchlist':
        summary.watchlistCount += 1;
        break;
      case 'watching':
        summary.watchingCount += 1;
        break;
      case 'completed':
        summary.completedCount += 1;
        break;
      case 'paused':
        summary.pausedCount += 1;
        break;
      case 'dropped':
        summary.droppedCount += 1;
        break;
    }
  }

  return summary;
}

/**
 * Fetches recently updated library entries for the overview page.
 */
export async function getRecentEntries(limit: number = 6): Promise<LibraryEntryItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('library_entries')
    .select(`
      *,
      media (*),
      episode_progress (*)
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching recent entries:', error?.message);
    return [];
  }

  return data.map(mapDbEntryToViewModel);
}

/**
 * Fetches entries currently in "watching" status for the continue-watching row.
 */
export async function getContinueWatchingEntries(limit: number = 6): Promise<LibraryEntryItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('library_entries')
    .select(`
      *,
      media (*),
      episode_progress (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'watching')
    .order('last_watched_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching continue watching entries:', error?.message);
    return [];
  }

  return data.map(mapDbEntryToViewModel);
}

interface PaginatedLibraryOptions {
  status?: LibraryStatus | 'all';
  query?: string;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

/**
 * Fetches paginated, filtered, searched, and sorted library entries for the user.
 */
export async function getPaginatedLibrary({
  status = 'all',
  query = '',
  sort = 'recent',
  page = 1,
  pageSize = 24,
}: PaginatedLibraryOptions): Promise<PaginatedLibraryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      items: [],
      totalCount: 0,
      page: 1,
      pageSize,
      totalPages: 0,
    };
  }

  const sanitizedQuery = query.replace(/[%_()]/g, '').trim();
  const hasSearch = sanitizedQuery.length > 0;

  // Use media!inner if searching so filter narrows down joined table rows
  const mediaSelect = hasSearch ? 'media!inner(*)' : 'media(*)';
  const selectQuery = `
    *,
    ${mediaSelect},
    episode_progress (*)
  `;

  let builder = supabase
    .from('library_entries')
    .select(selectQuery, { count: 'exact' })
    .eq('user_id', user.id);

  // Status Filter
  if (status !== 'all') {
    builder = builder.eq('status', status);
  }

  // Search filter on media.title or media.original_title
  if (hasSearch) {
    builder = builder.or(
      `title.ilike.%${sanitizedQuery}%,original_title.ilike.%${sanitizedQuery}%`,
      { referencedTable: 'media' }
    );
  }

  // Sorting
  switch (sort) {
    case 'last_watched':
      builder = builder.order('last_watched_at', { ascending: false, nullsFirst: false });
      break;
    case 'added':
      builder = builder.order('created_at', { ascending: false });
      break;
    case 'rating':
      builder = builder.order('rating', { ascending: false, nullsFirst: false });
      break;
    case 'title':
      builder = builder.order('title', { referencedTable: 'media', ascending: true });
      break;
    case 'year':
      builder = builder.order('release_year', { referencedTable: 'media', ascending: false, nullsFirst: false });
      break;
    case 'recent':
    default:
      builder = builder.order('updated_at', { ascending: false });
      break;
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  builder = builder.range(from, to);

  const { data, count, error } = await builder;

  if (error) {
    console.error('Error fetching paginated library:', error.message);
    return {
      items: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const items = (data || []).map(mapDbEntryToViewModel);

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Fetches full detail of a library entry with media, episode progress, and watch sessions.
 * Returns null if entry does not exist or does not belong to the current authenticated user.
 */
export async function getLibraryEntryDetail(
  entryId: string
): Promise<{
  entry: LibraryEntryItem;
  episodeProgressList: EpisodeProgressItem[];
  watchSessionsList: WatchSessionItem[];
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Fetch library entry with media
  const { data: entryData, error: entryError } = await supabase
    .from('library_entries')
    .select(`
      *,
      media (*)
    `)
    .eq('id', entryId)
    .eq('user_id', user.id)
    .single();

  if (entryError || !entryData) {
    return null;
  }

  // 2. Fetch episode progress list for this entry
  const { data: episodeData } = await supabase
    .from('episode_progress')
    .select('*')
    .eq('library_entry_id', entryId)
    .order('season_number', { ascending: true, nullsFirst: true })
    .order('episode_number', { ascending: true });

  const episodeProgressList: EpisodeProgressItem[] = (episodeData || []).map(ep => ({
    id: ep.id,
    libraryEntryId: ep.library_entry_id,
    seasonNumber: ep.season_number,
    episodeNumber: ep.episode_number,
    durationSeconds: ep.duration_seconds,
    progressSeconds: ep.progress_seconds || 0,
    progressPercent: ep.progress_percent,
    isCompleted: ep.is_completed || false,
    lastSourceName: ep.last_source_name,
    lastSourceUrl: ep.last_source_url,
    lastWatchedAt: ep.last_watched_at,
    updatedAt: ep.updated_at,
  }));

  // 3. Fetch watch sessions for this entry
  const { data: sessionData } = await supabase
    .from('watch_sessions')
    .select('*')
    .eq('library_entry_id', entryId)
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(10);

  const watchSessionsList: WatchSessionItem[] = (sessionData || []).map(ws => ({
    id: ws.id,
    libraryEntryId: ws.library_entry_id,
    episodeProgressId: ws.episode_progress_id,
    sourceName: ws.source_name,
    sourceUrl: ws.source_url,
    sourceDomain: ws.source_domain,
    watchedSeconds: ws.watched_seconds,
    startedAt: ws.started_at,
    endedAt: ws.ended_at,
    createdAt: ws.created_at,
  }));

  const entry = mapDbEntryToViewModel(entryData);

  return {
    entry,
    episodeProgressList,
    watchSessionsList,
  };
}
