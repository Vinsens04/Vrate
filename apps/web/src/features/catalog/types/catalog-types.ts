import type { LibraryStatus, MediaType, MetadataProvider } from '@vrate/shared';

export type CatalogCategory = 'movie' | 'tv' | 'anime';
export type CatalogFilterType = 'all' | 'movie' | 'series' | 'anime';
export type CatalogSource = 'all' | 'tmdb' | 'anilist';
export type InitialLibraryStatus = 'watchlist' | 'watching' | 'completed';

export interface CatalogMedia {
  provider: MetadataProvider;
  externalId: string;
  mediaType: MediaType;
  category: CatalogCategory;
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
  genres: string[];
  providerRating: number | null;
  providerRatingLabel: string;
  adult: boolean;
  providerMediaType?: 'movie' | 'tv';
  status?: string | null;
  inLibrary?: boolean;
  libraryEntryId?: string | null;
  libraryStatus?: LibraryStatus | null;
}

export interface ProviderStatusInfo {
  configured: boolean;
  available: boolean;
  hasNextPage: boolean;
  error?: string | null;
}

export interface CatalogSearchResult {
  results: CatalogMedia[];
  page: number;
  query: string;
  source: CatalogSource;
  filterType: CatalogFilterType;
  providers: {
    tmdb: ProviderStatusInfo;
    anilist: ProviderStatusInfo;
  };
}

export interface AddToLibraryInput {
  provider: MetadataProvider;
  externalId: string;
  providerMediaType?: 'movie' | 'tv';
  initialStatus: InitialLibraryStatus;
}

export interface AddToLibraryResult {
  success: boolean;
  entryId?: string;
  mediaId?: string;
  alreadyExists?: boolean;
  message: string;
  error?: string;
}
