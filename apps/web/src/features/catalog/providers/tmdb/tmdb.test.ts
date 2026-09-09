import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapTmdbMovieDetailToCatalogMedia,
  mapTmdbSearchItemToCatalogMedia,
  mapTmdbTvDetailToCatalogMedia,
} from './mapper.ts';
import {
  tmdbMovieDetailResponseSchema,
  tmdbMultiSearchResponseSchema,
  tmdbTvDetailResponseSchema,
} from './schemas.ts';
import type {
  TmdbMovieDetailResponse,
  TmdbMultiSearchResultItem,
  TmdbTvDetailResponse,
} from './types.ts';

test('TMDB: movie search item is correctly mapped', () => {
  const rawItem: TmdbMultiSearchResultItem = {
    id: 157336,
    media_type: 'movie',
    title: 'Interstellar',
    original_title: 'Interstellar',
    overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole...',
    poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop_path: '/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    release_date: '2014-11-05',
    genre_ids: [12, 18, 878],
    vote_average: 8.434,
    adult: false,
  };

  const mapped = mapTmdbSearchItemToCatalogMedia(rawItem);
  assert.ok(mapped !== null);
  assert.equal(mapped.provider, 'tmdb');
  assert.equal(mapped.externalId, '157336');
  assert.equal(mapped.mediaType, 'movie');
  assert.equal(mapped.category, 'movie');
  assert.equal(mapped.title, 'Interstellar');
  assert.equal(mapped.releaseYear, 2014);
  assert.equal(mapped.providerRating, 8.4);
  assert.equal(mapped.providerRatingLabel, '8.4/10 TMDB');
  assert.ok(mapped.posterUrl?.includes('image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'));
  assert.ok(mapped.genres.includes('Adventure'));
  assert.ok(mapped.genres.includes('Drama'));
  assert.ok(mapped.genres.includes('Sci-Fi'));
});

test('TMDB: TV search item is correctly mapped to series', () => {
  const rawItem: TmdbMultiSearchResultItem = {
    id: 1396,
    media_type: 'tv',
    name: 'Breaking Bad',
    original_name: 'Breaking Bad',
    overview: 'Walter White, a New Mexico chemistry teacher...',
    poster_path: '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
    backdrop_path: '/9faGSFi5jam6pDWGNd0p8J25Aq5.jpg',
    first_air_date: '2008-01-20',
    genre_ids: [18, 80],
    vote_average: 8.91,
    adult: false,
  };

  const mapped = mapTmdbSearchItemToCatalogMedia(rawItem);
  assert.ok(mapped !== null);
  assert.equal(mapped.provider, 'tmdb');
  assert.equal(mapped.externalId, '1396');
  assert.equal(mapped.mediaType, 'series');
  assert.equal(mapped.category, 'tv');
  assert.equal(mapped.title, 'Breaking Bad');
  assert.equal(mapped.releaseYear, 2008);
  assert.equal(mapped.providerRating, 8.9);
  assert.equal(mapped.providerRatingLabel, '8.9/10 TMDB');
  assert.ok(mapped.posterUrl?.includes('image.tmdb.org/t/p/w342/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg'));
  assert.ok(mapped.genres.includes('Drama'));
  assert.ok(mapped.genres.includes('Crime'));
});

test('TMDB: person results are completely ignored', () => {
  const rawItem: TmdbMultiSearchResultItem = {
    id: 500,
    media_type: 'person',
    name: 'Tom Cruise',
    adult: false,
  };

  const mapped = mapTmdbSearchItemToCatalogMedia(rawItem);
  assert.equal(mapped, null);
});

test('TMDB: adult search items are strictly filtered out', () => {
  const rawItem: TmdbMultiSearchResultItem = {
    id: 999999,
    media_type: 'movie',
    title: 'Adult Content Title',
    adult: true,
  };

  const mapped = mapTmdbSearchItemToCatalogMedia(rawItem);
  assert.equal(mapped, null);
});

test('TMDB: handles missing poster and missing overview gracefully', () => {
  const rawItem: TmdbMultiSearchResultItem = {
    id: 101010,
    media_type: 'movie',
    title: 'Indie Obscure Movie',
    poster_path: null,
    backdrop_path: null,
    overview: null,
    release_date: '',
    vote_average: 0,
    adult: false,
  };

  const mapped = mapTmdbSearchItemToCatalogMedia(rawItem);
  assert.ok(mapped !== null);
  assert.equal(mapped.posterUrl, null);
  assert.equal(mapped.backdropUrl, null);
  assert.equal(mapped.overview, null);
  assert.equal(mapped.releaseYear, null);
  assert.equal(mapped.providerRating, null);
  assert.equal(mapped.providerRatingLabel, 'TMDB');
});

test('TMDB: detail movie mapping handles runtime and full metadata', () => {
  const rawMovie: TmdbMovieDetailResponse = {
    id: 157336,
    title: 'Interstellar',
    original_title: 'Interstellar',
    overview: 'Exploration through wormhole',
    poster_path: '/poster.jpg',
    backdrop_path: '/backdrop.jpg',
    release_date: '2014-11-05',
    runtime: 169,
    genres: [
      { id: 12, name: 'Adventure' },
      { id: 18, name: 'Drama' },
    ],
    vote_average: 8.4,
    vote_count: 35000,
    adult: false,
    status: 'Released',
  };

  const mapped = mapTmdbMovieDetailToCatalogMedia(rawMovie);
  assert.equal(mapped.runtimeMinutes, 169);
  assert.equal(mapped.totalSeasons, null);
  assert.equal(mapped.totalEpisodes, null);
  assert.equal(mapped.status, 'Released');
  assert.deepEqual(mapped.genres, ['Adventure', 'Drama']);
});

test('TMDB: detail TV mapping handles seasons and episodes', () => {
  const rawTv: TmdbTvDetailResponse = {
    id: 1396,
    name: 'Breaking Bad',
    original_name: 'Breaking Bad',
    overview: 'Chemistry teacher turns kingpin',
    poster_path: '/poster.jpg',
    backdrop_path: '/backdrop.jpg',
    first_air_date: '2008-01-20',
    episode_run_time: [47],
    number_of_seasons: 5,
    number_of_episodes: 62,
    genres: [{ id: 18, name: 'Drama' }],
    vote_average: 8.9,
    vote_count: 14000,
    adult: false,
    status: 'Ended',
  };

  const mapped = mapTmdbTvDetailToCatalogMedia(rawTv);
  assert.equal(mapped.mediaType, 'series');
  assert.equal(mapped.category, 'tv');
  assert.equal(mapped.runtimeMinutes, 47);
  assert.equal(mapped.totalSeasons, 5);
  assert.equal(mapped.totalEpisodes, 62);
  assert.equal(mapped.status, 'Ended');
});

test('TMDB: Zod schemas validate valid response and reject invalid response', () => {
  const validSearch = {
    page: 1,
    results: [
      {
        id: 100,
        media_type: 'movie',
        title: 'Valid Movie',
      },
    ],
    total_pages: 1,
    total_results: 1,
  };

  const searchParse = tmdbMultiSearchResponseSchema.safeParse(validSearch);
  assert.equal(searchParse.success, true);

  const invalidSearch = {
    page: 'one', // should be number
    results: 'invalid',
  };
  const invalidParse = tmdbMultiSearchResponseSchema.safeParse(invalidSearch);
  assert.equal(invalidParse.success, false);
});
