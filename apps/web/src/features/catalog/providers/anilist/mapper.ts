import type { CatalogMedia } from '../../types/catalog-types.ts';
import { isAllowedImageUrl, sanitizeOverview } from '../../utils/image-urls.ts';
import type { AniListMediaItem } from './types.ts';

function buildReleaseDate(
  year?: number | null,
  month?: number | null,
  day?: number | null
): string | null {
  if (!year || year < 1880) return null;
  if (!month || month < 1 || month > 12) return `${year}-01-01`;
  const m = String(month).padStart(2, '0');
  if (!day || day < 1 || day > 31) return `${year}-${m}-01`;
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function mapAniListMediaToCatalogMedia(item: AniListMediaItem): CatalogMedia | null {
  if (item.isAdult === true) {
    return null;
  }

  const titleObj = item.title || {};
  const title = (
    titleObj.userPreferred ||
    titleObj.romaji ||
    titleObj.english ||
    titleObj.native ||
    ''
  ).trim();

  if (!title) return null;

  let originalTitle: string | null = null;
  if (titleObj.romaji && titleObj.romaji.trim() !== title) {
    originalTitle = titleObj.romaji.trim();
  } else if (titleObj.native && titleObj.native.trim() !== title) {
    originalTitle = titleObj.native.trim();
  }

  const isMovie = item.format === 'MOVIE';
  const releaseYear = item.startDate?.year ?? null;
  const releaseDate = buildReleaseDate(
    item.startDate?.year,
    item.startDate?.month,
    item.startDate?.day
  );

  const rawPoster =
    item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || null;
  const posterUrl = isAllowedImageUrl(rawPoster) ? rawPoster : null;

  const rawBackdrop = item.bannerImage || null;
  const backdropUrl = isAllowedImageUrl(rawBackdrop) ? rawBackdrop : null;

  const score = typeof item.averageScore === 'number' && item.averageScore > 0 ? item.averageScore : null;
  const providerRating = score !== null ? Number((score / 10).toFixed(1)) : null;
  const providerRatingLabel = score !== null ? `${score}% AniList` : 'AniList';

  const genres = Array.isArray(item.genres)
    ? item.genres.filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
    : [];

  return {
    provider: 'anilist',
    externalId: String(item.id),
    mediaType: isMovie ? 'movie' : 'series',
    category: 'anime',
    title,
    originalTitle,
    overview: sanitizeOverview(item.description),
    posterUrl,
    backdropUrl,
    releaseDate,
    releaseYear,
    runtimeMinutes: typeof item.duration === 'number' && item.duration > 0 ? item.duration : null,
    totalSeasons: null,
    totalEpisodes: typeof item.episodes === 'number' && item.episodes > 0 ? item.episodes : null,
    genres,
    providerRating,
    providerRatingLabel,
    adult: false,
    status: item.status || null,
  };
}
