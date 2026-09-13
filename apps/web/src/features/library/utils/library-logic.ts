import { LIBRARY_STATUSES, type LibraryStatus, type MediaType } from '@vrate/shared';
import type {
  LibraryEntryItem,
  MediaItem,
  SortOption,
  EpisodeProgressItem,
} from '../types/library-types.ts';
import { SORT_OPTIONS } from '../schemas/library-schemas.ts';

/**
 * Parses and validates the status filter from URL search parameters.
 * Whitelists valid library_status or returns 'all'.
 */
export function parseFilterStatus(param: string | null | undefined): LibraryStatus | 'all' {
  if (!param) return 'all';
  const normalized = param.toLowerCase().trim();
  if (normalized === 'all') return 'all';
  if ((LIBRARY_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as LibraryStatus;
  }
  return 'all';
}

/**
 * Parses and validates the sort option from URL search parameters.
 * Whitelists allowed sort values or falls back to 'recent'.
 */
export function parseSortOption(param: string | null | undefined): SortOption {
  if (!param) return 'recent';
  const normalized = param.toLowerCase().trim();
  if ((SORT_OPTIONS as readonly string[]).includes(normalized)) {
    return normalized as SortOption;
  }
  return 'recent';
}

/**
 * Parses page number safely. Minimum page is 1.
 */
export function parsePageNumber(param: string | null | undefined): number {
  if (!param) return 1;
  const parsed = parseInt(param, 10);
  if (isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}

/**
 * Builds safe URL query string preserving existing filters while updating specific keys.
 */
export function buildLibraryUrl(
  basePath: string,
  currentParams: Record<string, string | number | undefined>,
  updates: Record<string, string | number | null | undefined>
): string {
  const merged: Record<string, string> = {};

  for (const [key, value] of Object.entries(currentParams)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      merged[key] = String(value);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || String(value).trim() === '' || (key === 'page' && Number(value) === 1)) {
      delete merged[key];
    } else {
      merged[key] = String(value);
    }
  }

  // If status is 'all', remove it from search params to keep URL clean
  if (merged.status === 'all') {
    delete merged.status;
  }

  // If sort is default 'recent', remove it to keep URL clean
  if (merged.sort === 'recent') {
    delete merged.sort;
  }

  const query = new URLSearchParams(merged).toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * Business logic for status transition dates:
 * - watchlist -> watching: sets started_at if not already populated.
 * - any -> completed: sets completed_at if not already populated.
 * - leaving completed: preserves completed_at history.
 * - last_watched_at is not modified by manual status changes.
 */
export function calculateStatusDates(
  currentStatus: LibraryStatus,
  newStatus: LibraryStatus,
  existingStartedAt: string | null,
  existingCompletedAt: string | null,
  nowIso: string = new Date().toISOString()
): { startedAt: string | null; completedAt: string | null } {
  let startedAt = existingStartedAt;
  let completedAt = existingCompletedAt;

  // If moving to watching and started_at is empty
  if (newStatus === 'watching' && !startedAt) {
    startedAt = nowIso;
  }

  // If moving to completed and completed_at is empty
  if (newStatus === 'completed' && !completedAt) {
    completedAt = nowIso;
    // If started_at was never set, also set started_at
    if (!startedAt) {
      startedAt = nowIso;
    }
  }

  // Do not wipe completedAt when leaving completed status
  return { startedAt, completedAt };
}

/**
 * Returns human-readable label for LibraryStatus.
 */
export function formatStatusLabel(status: LibraryStatus | 'all'): string {
  switch (status) {
    case 'all':
      return 'All';
    case 'watchlist':
      return 'Watchlist';
    case 'watching':
      return 'Watching';
    case 'completed':
      return 'Completed';
    case 'paused':
      return 'Paused';
    case 'dropped':
      return 'Dropped';
    default:
      return status;
  }
}

/**
 * Returns accessible styling classes for status badges.
 */
export function formatStatusBadgeStyle(status: LibraryStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'watchlist':
      return {
        bg: 'bg-app-bg/90',
        text: 'text-app-muted',
        border: 'border-app-border',
        dot: 'bg-app-dim',
      };
    case 'watching':
      return {
        bg: 'bg-brand-primary/10',
        text: 'text-brand-primary',
        border: 'border-brand-primary/35',
        dot: 'bg-brand-primary',
      };
    case 'completed':
      return {
        bg: 'bg-brand-success/10',
        text: 'text-brand-success',
        border: 'border-brand-success/35',
        dot: 'bg-brand-success',
      };
    case 'paused':
      return {
        bg: 'bg-brand-warning/10',
        text: 'text-brand-warning',
        border: 'border-brand-warning/35',
        dot: 'bg-brand-warning',
      };
    case 'dropped':
      return {
        bg: 'bg-brand-danger/10',
        text: 'text-brand-danger',
        border: 'border-brand-danger/35',
        dot: 'bg-brand-danger',
      };
    default:
      return {
        bg: 'bg-app-surface',
        text: 'text-app-muted',
        border: 'border-app-border',
        dot: 'bg-app-dim',
      };
  }
}

/**
 * Formats rating for UI display (e.g. 8.5 -> "8.5 / 10", null -> "Unrated").
 */
export function formatRating(rating: number | null): string {
  if (rating === null || rating === undefined) return 'Unrated';
  return `${Number(rating).toFixed(1)} / 10`;
}

/**
 * Formats media type label in English.
 */
export function formatMediaType(type: MediaType): string {
  switch (type) {
    case 'movie':
      return 'Movie';
    case 'series':
      return 'Series';
    default:
      return type;
  }
}

/**
 * Formats duration in minutes (e.g. 142 -> "2h 22m").
 */
export function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '-';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

/**
 * Formats a date to locale format (e.g. "September 8, 2026").
 */
export function formatDate(isoString: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

/**
 * Formats relative time in English (e.g. "2h ago", "Yesterday", "Just now").
 */
export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    return formatDate(isoString);
  } catch {
    return '-';
  }
}

/**
 * Maps database row join to typed View Model.
 */
export function mapDbEntryToViewModel(row: any): LibraryEntryItem {
  const mediaRaw = row.media || {};
  const media: MediaItem = {
    id: mediaRaw.id || row.media_id,
    mediaType: mediaRaw.media_type || 'movie',
    title: mediaRaw.title || 'Untitled',
    originalTitle: mediaRaw.original_title || null,
    overview: mediaRaw.overview || null,
    posterUrl: mediaRaw.poster_url || null,
    backdropUrl: mediaRaw.backdrop_url || null,
    releaseDate: mediaRaw.release_date || null,
    releaseYear: mediaRaw.release_year || null,
    runtimeMinutes: mediaRaw.runtime_minutes || null,
    totalSeasons: mediaRaw.total_seasons || null,
    totalEpisodes: mediaRaw.total_episodes || null,
    metadata: mediaRaw.metadata || {},
  };

  let latestEpisodeProgress: EpisodeProgressItem | null = null;
  if (Array.isArray(row.episode_progress) && row.episode_progress.length > 0) {
    const sorted = [...row.episode_progress].sort((a, b) => {
      const timeA = new Date(a.last_watched_at || a.updated_at || a.created_at || 0).getTime();
      const timeB = new Date(b.last_watched_at || b.updated_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });
    const ep = sorted[0];
    if (ep) {
      latestEpisodeProgress = {
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
      };
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    mediaId: row.media_id,
    status: row.status as LibraryStatus,
    rating: row.rating !== null ? Number(row.rating) : null,
    isFavorite: Boolean(row.is_favorite),
    notes: row.notes || null,
    startedAt: row.started_at || null,
    completedAt: row.completed_at || null,
    lastWatchedAt: row.last_watched_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    media,
    latestEpisodeProgress,
    episodeProgressCount: Array.isArray(row.episode_progress)
      ? row.episode_progress.length
      : 0,
  };
}

/**
 * Formats concise episode badge with progress for dashboard cards.
 * Rules:
 * - Movie: returns null (never show episode badge on movie).
 * - Invalid episode data: returns null (never show E? or fake value).
 * - Series with season (> 1): S2E1
 * - Anime / single season: E1
 * - With progress: "E2 • 34%" or "S2E2 • 34%"
 * - Completed: "E2 • Completed"
 */
export function formatEpisodeBadge(
  mediaType: MediaType,
  progress: EpisodeProgressItem | null | undefined,
  totalSeasons?: number | null
): string | null {
  if (mediaType === 'movie' || !progress) return null;

  const epNum = progress.episodeNumber;
  if (typeof epNum !== 'number' || isNaN(epNum) || epNum <= 0) {
    return null;
  }

  const seasonNum = progress.seasonNumber;
  const isMultiSeason =
    (seasonNum !== null && seasonNum !== undefined && seasonNum > 1) ||
    (totalSeasons !== null && totalSeasons !== undefined && totalSeasons > 1);

  const prefix = isMultiSeason && seasonNum && seasonNum > 1
    ? `S${seasonNum}E${epNum}`
    : isMultiSeason && seasonNum === 1
      ? `S1E${epNum}`
      : `E${epNum}`;

  if (progress.isCompleted) {
    return `${prefix} • Completed`;
  }

  if (
    progress.progressPercent !== null &&
    progress.progressPercent !== undefined &&
    progress.progressPercent > 0
  ) {
    return `${prefix} • ${Math.round(progress.progressPercent)}%`;
  }

  return prefix;
}


