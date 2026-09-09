import type { LibraryStatus, MediaType } from '@vrate/shared';

export type SortOption =
  | 'recent'
  | 'last_watched'
  | 'added'
  | 'title'
  | 'rating'
  | 'year';

export type FilterStatusOption = LibraryStatus | 'all';

export interface DashboardSummary {
  totalCount: number;
  watchlistCount: number;
  watchingCount: number;
  completedCount: number;
  pausedCount: number;
  droppedCount: number;
}

export interface MediaItem {
  id: string;
  mediaType: MediaType;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  releaseYear: number | null;
  runtimeMinutes: number | null;
  totalSeasons: number | null;
  totalEpisodes: number | null;
  metadata?: Record<string, unknown>;
}

export interface EpisodeProgressItem {
  id: string;
  libraryEntryId: string;
  seasonNumber: number | null;
  episodeNumber: number;
  durationSeconds: number | null;
  progressSeconds: number;
  progressPercent?: number;
  isCompleted: boolean;
  lastSourceName?: string | null;
  lastSourceUrl?: string | null;
  lastWatchedAt: string | null;
  updatedAt: string;
}

export interface WatchSessionItem {
  id: string;
  libraryEntryId: string;
  episodeProgressId: string | null;
  sourceName: string;
  sourceUrl: string | null;
  sourceDomain: string | null;
  watchedSeconds: number;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

export interface LibraryEntryItem {
  id: string;
  userId: string;
  mediaId: string;
  status: LibraryStatus;
  rating: number | null;
  isFavorite: boolean;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastWatchedAt: string | null;
  createdAt: string;
  updatedAt: string;
  media: MediaItem;
  latestEpisodeProgress?: EpisodeProgressItem | null;
  episodeProgressCount?: number;
}

export interface PaginatedLibraryResult {
  items: LibraryEntryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LibrarySearchParams {
  status?: string;
  q?: string;
  sort?: string;
  page?: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
