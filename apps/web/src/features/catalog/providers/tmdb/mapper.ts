import type { CatalogMedia } from '../../types/catalog-types.ts';
import { buildTmdbImageUrl, sanitizeOverview } from '../../utils/image-urls.ts';
import type {
  TmdbMovieDetailResponse,
  TmdbMultiSearchResultItem,
  TmdbTvDetailResponse,
} from './types.ts';

const TMDB_GENRES_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

function parseYear(dateString: string | null | undefined): number | null {
  if (!dateString || typeof dateString !== 'string') return null;
  const match = dateString.match(/^(\d{4})/);
  if (match) {
    const year = parseInt(match[1], 10);
    return isNaN(year) ? null : year;
  }
  return null;
}

function resolveGenres(genreIds?: number[]): string[] {
  if (!genreIds || !Array.isArray(genreIds)) return [];
  return genreIds
    .map((id) => TMDB_GENRES_MAP[id])
    .filter((name): name is string => Boolean(name));
}

export function mapTmdbSearchItemToCatalogMedia(
  item: TmdbMultiSearchResultItem
): CatalogMedia | null {
  if (item.media_type !== 'movie' && item.media_type !== 'tv') {
    return null;
  }

  if (item.adult === true) {
    return null;
  }

  const isMovie = item.media_type === 'movie';
  const rawTitle = isMovie ? item.title || item.original_title : item.name || item.original_name;
  const title = (rawTitle || '').trim();
  if (!title) return null;

  const rawOriginalTitle = isMovie ? item.original_title : item.original_name;
  const originalTitle =
    rawOriginalTitle && rawOriginalTitle.trim() !== title ? rawOriginalTitle.trim() : null;

  const rawDate = isMovie ? item.release_date : item.first_air_date;
  const releaseDate = rawDate && rawDate.trim().length > 0 ? rawDate.trim() : null;
  const releaseYear = parseYear(releaseDate);

  const rating =
    typeof item.vote_average === 'number' && item.vote_average > 0
      ? Number(item.vote_average.toFixed(1))
      : null;

  return {
    provider: 'tmdb',
    externalId: String(item.id),
    mediaType: isMovie ? 'movie' : 'series',
    category: isMovie ? 'movie' : 'tv',
    title,
    originalTitle,
    overview: sanitizeOverview(item.overview),
    posterUrl: buildTmdbImageUrl(item.poster_path, 'w342'),
    backdropUrl: buildTmdbImageUrl(item.backdrop_path, 'w1280'),
    releaseDate,
    releaseYear,
    runtimeMinutes: null,
    totalSeasons: null,
    totalEpisodes: null,
    genres: resolveGenres(item.genre_ids),
    providerRating: rating,
    providerRatingLabel: rating !== null ? `${rating.toFixed(1)}/10 TMDB` : 'TMDB',
    adult: false,
    providerMediaType: isMovie ? 'movie' : 'tv',
  };
}

export function mapTmdbMovieDetailToCatalogMedia(
  movie: TmdbMovieDetailResponse
): CatalogMedia {
  const title = (movie.title || movie.original_title || '').trim();
  const originalTitle =
    movie.original_title && movie.original_title.trim() !== title
      ? movie.original_title.trim()
      : null;

  const releaseDate = movie.release_date && movie.release_date.trim().length > 0
    ? movie.release_date.trim()
    : null;
  const releaseYear = parseYear(releaseDate);

  const rating =
    typeof movie.vote_average === 'number' && movie.vote_average > 0
      ? Number(movie.vote_average.toFixed(1))
      : null;

  const genres = Array.isArray(movie.genres)
    ? movie.genres.map((g) => g.name).filter(Boolean)
    : [];

  return {
    provider: 'tmdb',
    externalId: String(movie.id),
    mediaType: 'movie',
    category: 'movie',
    title: title || 'Tanpa Judul',
    originalTitle,
    overview: sanitizeOverview(movie.overview),
    posterUrl: buildTmdbImageUrl(movie.poster_path, 'w500'),
    backdropUrl: buildTmdbImageUrl(movie.backdrop_path, 'w1280'),
    releaseDate,
    releaseYear,
    runtimeMinutes: typeof movie.runtime === 'number' && movie.runtime > 0 ? movie.runtime : null,
    totalSeasons: null,
    totalEpisodes: null,
    genres,
    providerRating: rating,
    providerRatingLabel: rating !== null ? `${rating.toFixed(1)}/10 TMDB` : 'TMDB',
    adult: Boolean(movie.adult),
    providerMediaType: 'movie',
    status: movie.status || null,
  };
}

export function mapTmdbTvDetailToCatalogMedia(
  tv: TmdbTvDetailResponse
): CatalogMedia {
  const title = (tv.name || tv.original_name || '').trim();
  const originalTitle =
    tv.original_name && tv.original_name.trim() !== title ? tv.original_name.trim() : null;

  const releaseDate = tv.first_air_date && tv.first_air_date.trim().length > 0
    ? tv.first_air_date.trim()
    : null;
  const releaseYear = parseYear(releaseDate);

  const rating =
    typeof tv.vote_average === 'number' && tv.vote_average > 0
      ? Number(tv.vote_average.toFixed(1))
      : null;

  const genres = Array.isArray(tv.genres)
    ? tv.genres.map((g) => g.name).filter(Boolean)
    : [];

  const runtimeMinutes =
    Array.isArray(tv.episode_run_time) && tv.episode_run_time.length > 0
      ? tv.episode_run_time[0]
      : null;

  return {
    provider: 'tmdb',
    externalId: String(tv.id),
    mediaType: 'series',
    category: 'tv',
    title: title || 'Tanpa Judul',
    originalTitle,
    overview: sanitizeOverview(tv.overview),
    posterUrl: buildTmdbImageUrl(tv.poster_path, 'w500'),
    backdropUrl: buildTmdbImageUrl(tv.backdrop_path, 'w1280'),
    releaseDate,
    releaseYear,
    runtimeMinutes,
    totalSeasons: tv.number_of_seasons > 0 ? tv.number_of_seasons : null,
    totalEpisodes: tv.number_of_episodes > 0 ? tv.number_of_episodes : null,
    genres,
    providerRating: rating,
    providerRatingLabel: rating !== null ? `${rating.toFixed(1)}/10 TMDB` : 'TMDB',
    adult: Boolean(tv.adult),
    providerMediaType: 'tv',
    status: tv.status || null,
  };
}
