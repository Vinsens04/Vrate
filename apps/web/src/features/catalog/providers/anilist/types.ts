export type AniListFormat =
  | 'TV'
  | 'TV_SHORT'
  | 'MOVIE'
  | 'SPECIAL'
  | 'OVA'
  | 'ONA'
  | 'MUSIC'
  | 'MANGA'
  | 'NOVEL'
  | 'ONE_SHOT';

export interface AniListTitle {
  userPreferred?: string | null;
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
}

export interface AniListCoverImage {
  extraLarge?: string | null;
  large?: string | null;
  medium?: string | null;
  color?: string | null;
}

export interface AniListFuzzyDate {
  year?: number | null;
  month?: number | null;
  day?: number | null;
}

export interface AniListMediaItem {
  id: number;
  format?: string | null;
  title: AniListTitle;
  description?: string | null;
  coverImage?: AniListCoverImage | null;
  bannerImage?: string | null;
  startDate?: AniListFuzzyDate | null;
  episodes?: number | null;
  duration?: number | null;
  genres?: string[] | null;
  averageScore?: number | null;
  isAdult?: boolean | null;
  status?: string | null;
}

export interface AniListPageInfo {
  total?: number | null;
  currentPage?: number | null;
  lastPage?: number | null;
  hasNextPage?: boolean | null;
  perPage?: number | null;
}

export interface AniListSearchResponse {
  data?: {
    Page?: {
      pageInfo?: AniListPageInfo | null;
      media?: (AniListMediaItem | null)[] | null;
    } | null;
  } | null;
  errors?: Array<{
    message: string;
    status?: number;
  }>;
}

export interface AniListDetailResponse {
  data?: {
    Media?: AniListMediaItem | null;
  } | null;
  errors?: Array<{
    message: string;
    status?: number;
  }>;
}
