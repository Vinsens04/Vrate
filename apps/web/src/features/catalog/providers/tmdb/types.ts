export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMultiSearchResultItem {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  original_title?: string | null;
  original_name?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  genre_ids?: number[];
  vote_average?: number | null;
  vote_count?: number | null;
  adult?: boolean;
  popularity?: number;
}

export interface TmdbMultiSearchResponse {
  page: number;
  results: TmdbMultiSearchResultItem[];
  total_pages: number;
  total_results: number;
}

export interface TmdbMovieDetailResponse {
  id: number;
  title: string;
  original_title?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  runtime?: number | null;
  genres: TmdbGenre[];
  vote_average?: number | null;
  vote_count?: number | null;
  adult: boolean;
  status?: string | null;
  tagline?: string | null;
}

export interface TmdbTvDetailResponse {
  id: number;
  name: string;
  original_name?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string | null;
  episode_run_time?: number[] | null;
  number_of_seasons: number;
  number_of_episodes: number;
  genres: TmdbGenre[];
  vote_average?: number | null;
  vote_count?: number | null;
  adult: boolean;
  status?: string | null;
  tagline?: string | null;
}
