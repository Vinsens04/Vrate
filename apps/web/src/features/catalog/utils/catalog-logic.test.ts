import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addToLibrarySchema,
  catalogDetailParamSchema,
  catalogSearchParamSchema,
} from '../schemas/catalog-schemas.ts';
import {
  buildDiscoverUrl,
  calculateInitialStatusDates,
  formatProviderScore,
  parseCatalogFilter,
  parseCatalogPage,
  parseCatalogSource,
} from './catalog-logic.ts';
import { isAllowedImageUrl, sanitizeOverview } from './image-urls.ts';

test('catalogSearchParamSchema: enforces query length and whitelist', () => {
  // Valid queries
  assert.equal(catalogSearchParamSchema.safeParse({ q: 'Naruto' }).success, true);
  assert.equal(catalogSearchParamSchema.safeParse({ q: 'AB' }).success, true);
  assert.equal(catalogSearchParamSchema.safeParse({ q: 'Breaking Bad', source: 'tmdb', type: 'series', page: 2 }).success, true);

  // Invalid queries: too short (< 2 chars)
  assert.equal(catalogSearchParamSchema.safeParse({ q: 'a' }).success, false);
  assert.equal(catalogSearchParamSchema.safeParse({ q: '' }).success, false);
  assert.equal(catalogSearchParamSchema.safeParse({ q: '   ' }).success, false);

  // Invalid queries: too long (> 100 chars)
  assert.equal(catalogSearchParamSchema.safeParse({ q: 'a'.repeat(101) }).success, false);

  // Invalid source
  assert.equal(catalogSearchParamSchema.safeParse({ q: 'Interstellar', source: 'hacker_source' }).success, false);

  // Invalid type
  assert.equal(catalogSearchParamSchema.safeParse({ q: 'Interstellar', type: 'malicious_type' }).success, false);

  // Invalid page
  assert.equal(catalogSearchParamSchema.safeParse({ q: 'Interstellar', page: 0 }).success, false);
  assert.equal(catalogSearchParamSchema.safeParse({ q: 'Interstellar', page: 51 }).success, false);
});

test('addToLibrarySchema: enforces provider rules and required providerMediaType for TMDB', () => {
  // TMDB with providerMediaType is valid
  assert.equal(
    addToLibrarySchema.safeParse({
      provider: 'tmdb',
      externalId: '157336',
      providerMediaType: 'movie',
      initialStatus: 'watchlist',
    }).success,
    true
  );

  // TMDB without providerMediaType is REJECTED
  assert.equal(
    addToLibrarySchema.safeParse({
      provider: 'tmdb',
      externalId: '157336',
      initialStatus: 'watchlist',
    }).success,
    false
  );

  // AniList without providerMediaType is valid
  assert.equal(
    addToLibrarySchema.safeParse({
      provider: 'anilist',
      externalId: '102976',
      initialStatus: 'watching',
    }).success,
    true
  );

  // Non-numeric external ID is rejected
  assert.equal(
    addToLibrarySchema.safeParse({
      provider: 'anilist',
      externalId: 'non-numeric-id!;',
      initialStatus: 'watchlist',
    }).success,
    false
  );

  // Invalid status is rejected
  assert.equal(
    addToLibrarySchema.safeParse({
      provider: 'anilist',
      externalId: '102976',
      initialStatus: 'invalid_status',
    }).success,
    false
  );
});

test('catalogDetailParamSchema: validates route params', () => {
  // Valid TMDB movie
  assert.equal(
    catalogDetailParamSchema.safeParse({
      provider: 'tmdb',
      externalId: '157336',
      type: 'movie',
    }).success,
    true
  );

  // TMDB missing type is rejected
  assert.equal(
    catalogDetailParamSchema.safeParse({
      provider: 'tmdb',
      externalId: '157336',
    }).success,
    false
  );

  // Valid AniList
  assert.equal(
    catalogDetailParamSchema.safeParse({
      provider: 'anilist',
      externalId: '102976',
    }).success,
    true
  );

  // Unsupported provider rejected
  assert.equal(
    catalogDetailParamSchema.safeParse({
      provider: 'netflix',
      externalId: '100',
    }).success,
    false
  );
});

test('calculateInitialStatusDates: sets appropriate transition dates', () => {
  const fixedNow = '2026-09-09T10:00:00.000Z';

  // Watchlist: no started_at, no completed_at
  const wl = calculateInitialStatusDates('watchlist', fixedNow);
  assert.equal(wl.startedAt, null);
  assert.equal(wl.completedAt, null);

  // Watching: sets started_at
  const wt = calculateInitialStatusDates('watching', fixedNow);
  assert.equal(wt.startedAt, fixedNow);
  assert.equal(wt.completedAt, null);

  // Completed: sets both started_at and completed_at
  const cp = calculateInitialStatusDates('completed', fixedNow);
  assert.equal(cp.startedAt, fixedNow);
  assert.equal(cp.completedAt, fixedNow);
});

test('isAllowedImageUrl: permits strictly whitelisted image domains and rejects others', () => {
  // Allowed
  assert.equal(isAllowedImageUrl('https://image.tmdb.org/t/p/w342/poster.jpg'), true);
  assert.equal(isAllowedImageUrl('https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1.jpg'), true);
  assert.equal(isAllowedImageUrl('https://img.anilist.co/banner.jpg'), true);

  // Rejected
  assert.equal(isAllowedImageUrl('https://malicious-site.com/image.jpg'), false);
  assert.equal(isAllowedImageUrl('http://image.tmdb.org/insecure.jpg'), false); // HTTP rejected
  assert.equal(isAllowedImageUrl('javascript:alert(1)'), false);
  assert.equal(isAllowedImageUrl(null), false);
  assert.equal(isAllowedImageUrl(undefined), false);
});

test('buildDiscoverUrl: preserves and updates search parameters properly', () => {
  const base = '/dashboard/discover';

  // Query and source
  assert.equal(
    buildDiscoverUrl(base, {}, { q: 'Frieren', source: 'anilist' }),
    '/dashboard/discover?q=Frieren&source=anilist'
  );

  // Changing page preserves existing filters
  assert.equal(
    buildDiscoverUrl(base, { q: 'Naruto', type: 'anime' }, { page: 2 }),
    '/dashboard/discover?q=Naruto&type=anime&page=2'
  );

  // Page 1 is omitted
  assert.equal(
    buildDiscoverUrl(base, { q: 'Naruto', page: '3' }, { page: 1 }),
    '/dashboard/discover?q=Naruto'
  );
});

test('formatProviderScore: formats score labels accurately', () => {
  assert.equal(
    formatProviderScore({ provider: 'tmdb', providerRating: 8.4 }),
    '8.4/10 TMDB'
  );
  assert.equal(
    formatProviderScore({ provider: 'anilist', providerRating: 8.4 }),
    '84% AniList'
  );
  assert.equal(
    formatProviderScore({ provider: 'tmdb', providerRating: null }),
    'TMDB'
  );
});

test('parse filter and page helpers handle invalid values safely', () => {
  assert.equal(parseCatalogFilter('movie'), 'movie');
  assert.equal(parseCatalogFilter('SERIES'), 'series');
  assert.equal(parseCatalogFilter('unknown'), 'all');

  assert.equal(parseCatalogSource('tmdb'), 'tmdb');
  assert.equal(parseCatalogSource('ANILIST'), 'anilist');
  assert.equal(parseCatalogSource('invalid'), 'all');

  assert.equal(parseCatalogPage('5'), 5);
  assert.equal(parseCatalogPage('-1'), 1);
  assert.equal(parseCatalogPage('999'), 50);
  assert.equal(parseCatalogPage('abc'), 1);
});
