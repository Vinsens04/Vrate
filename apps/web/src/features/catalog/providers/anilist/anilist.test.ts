import test from 'node:test';
import assert from 'node:assert/strict';
import { mapAniListMediaToCatalogMedia } from './mapper.ts';
import {
  anilistDetailResponseSchema,
  anilistSearchResponseSchema,
} from './schemas.ts';
import type { AniListMediaItem } from './types.ts';

test('AniList: Anime movie is mapped to mediaType movie', () => {
  const rawItem: AniListMediaItem = {
    id: 102976,
    format: 'MOVIE',
    title: {
      userPreferred: 'Kono Subarashii Sekai ni Shukufuku wo! Kurenai Densetsu',
      romaji: 'Kono Subarashii Sekai ni Shukufuku wo! Kurenai Densetsu',
      english: "KONOSUBA -God's blessing on this wonderful world!- Legend of Crimson",
      native: 'この素晴らしい世界に祝福を！紅伝説',
    },
    description: 'Kazuma and his party travel to Megumin&rsquo;s hometown.<br><br>A new danger awaits!',
    coverImage: {
      extraLarge: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx102976-1.jpg',
    },
    bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/102976.jpg',
    startDate: { year: 2019, month: 8, day: 30 },
    duration: 90,
    episodes: 1,
    genres: ['Action', 'Adventure', 'Comedy', 'Fantasy'],
    averageScore: 84,
    isAdult: false,
    status: 'FINISHED',
  };

  const mapped = mapAniListMediaToCatalogMedia(rawItem);
  assert.ok(mapped !== null);
  assert.equal(mapped.provider, 'anilist');
  assert.equal(mapped.externalId, '102976');
  assert.equal(mapped.mediaType, 'movie');
  assert.equal(mapped.category, 'anime');
  assert.equal(mapped.title, 'Kono Subarashii Sekai ni Shukufuku wo! Kurenai Densetsu');
  assert.equal(mapped.releaseYear, 2019);
  assert.equal(mapped.releaseDate, '2019-08-30');
  assert.equal(mapped.runtimeMinutes, 90);
  assert.equal(mapped.totalEpisodes, 1);
  assert.equal(mapped.providerRating, 8.4);
  assert.equal(mapped.providerRatingLabel, '84% AniList');
  assert.ok(mapped.posterUrl?.startsWith('https://s4.anilist.co/'));
  assert.ok(mapped.backdropUrl?.startsWith('https://s4.anilist.co/'));
});

test('AniList: Episodic format TV is mapped to series', () => {
  const rawItem: AniListMediaItem = {
    id: 154587,
    format: 'TV',
    title: {
      userPreferred: "Sousou no Frieren",
      romaji: "Sousou no Frieren",
      english: "Frieren: Beyond Journey's End",
      native: "葬送のフリーレン",
    },
    startDate: { year: 2023, month: 9, day: 29 },
    episodes: 28,
    duration: 24,
    genres: ['Adventure', 'Drama', 'Fantasy'],
    averageScore: 94,
    isAdult: false,
    status: 'FINISHED',
  };

  const mapped = mapAniListMediaToCatalogMedia(rawItem);
  assert.ok(mapped !== null);
  assert.equal(mapped.mediaType, 'series');
  assert.equal(mapped.category, 'anime');
  assert.equal(mapped.totalEpisodes, 28);
  assert.equal(mapped.runtimeMinutes, 24);
  assert.equal(mapped.providerRating, 9.4);
});

test('AniList: Title fallback cascades through available titles', () => {
  // Case 1: Only romaji available
  const item1: AniListMediaItem = {
    id: 1,
    title: { romaji: 'Romaji Title Only' },
    isAdult: false,
  };
  assert.equal(mapAniListMediaToCatalogMedia(item1)?.title, 'Romaji Title Only');

  // Case 2: Only english available
  const item2: AniListMediaItem = {
    id: 2,
    title: { english: 'English Title Only' },
    isAdult: false,
  };
  assert.equal(mapAniListMediaToCatalogMedia(item2)?.title, 'English Title Only');

  // Case 3: Only native available
  const item3: AniListMediaItem = {
    id: 3,
    title: { native: '日本語タイトル' },
    isAdult: false,
  };
  assert.equal(mapAniListMediaToCatalogMedia(item3)?.title, '日本語タイトル');
});

test('AniList: HTML description is safely sanitized with paragraphs preserved', () => {
  const rawItem: AniListMediaItem = {
    id: 10,
    title: { userPreferred: 'Test Anime' },
    description: '<p>Baris pertama.</p><br><b>Teks tebal</b> &amp; <i>teks miring</i>.<br><br><a href="https://example.com">Link luar</a>.',
    isAdult: false,
  };

  const mapped = mapAniListMediaToCatalogMedia(rawItem);
  assert.ok(mapped?.overview);
  assert.ok(!mapped.overview.includes('<p>'));
  assert.ok(!mapped.overview.includes('<b>'));
  assert.ok(!mapped.overview.includes('<i>'));
  assert.ok(!mapped.overview.includes('<a'));
  assert.ok(mapped.overview.includes('&')); // &amp; decoded to &
  assert.ok(mapped.overview.includes('Teks tebal'));
});

test('AniList: adult results are excluded', () => {
  const rawItem: AniListMediaItem = {
    id: 999,
    title: { userPreferred: 'Hentai Anime' },
    isAdult: true,
  };

  const mapped = mapAniListMediaToCatalogMedia(rawItem);
  assert.equal(mapped, null);
});

test('AniList: missing poster and banner fallback gracefully', () => {
  const rawItem: AniListMediaItem = {
    id: 20,
    title: { userPreferred: 'No Image Anime' },
    coverImage: null,
    bannerImage: null,
    isAdult: false,
  };

  const mapped = mapAniListMediaToCatalogMedia(rawItem);
  assert.ok(mapped !== null);
  assert.equal(mapped.posterUrl, null);
  assert.equal(mapped.backdropUrl, null);
});

test('AniList: Zod schema parses pageInfo and hasNextPage', () => {
  const validResponse = {
    data: {
      Page: {
        pageInfo: {
          total: 100,
          currentPage: 1,
          hasNextPage: true,
        },
        media: [
          {
            id: 102976,
            format: 'MOVIE',
            title: { userPreferred: 'KonoSuba' },
          },
        ],
      },
    },
  };

  const parsed = anilistSearchResponseSchema.safeParse(validResponse);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.data?.Page?.pageInfo?.hasNextPage, true);
    assert.equal(parsed.data.data?.Page?.media?.[0]?.id, 102976);
  }
});

test('AniList: Zod schema detects GraphQL errors', () => {
  const errorResponse = {
    errors: [
      {
        message: 'Rate limit exceeded.',
        status: 429,
      },
    ],
  };

  const parsed = anilistSearchResponseSchema.safeParse(errorResponse);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.errors?.[0]?.message, 'Rate limit exceeded.');
  }
});
