import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFilterStatus,
  parseSortOption,
  parsePageNumber,
  buildLibraryUrl,
  calculateStatusDates,
  formatStatusLabel,
  formatDuration,
  mapDbEntryToViewModel,
} from './library-logic.ts';
import {
  updateRatingSchema,
  updateNotesSchema,
  updateStatusSchema,
} from '../schemas/library-schemas.ts';

test('parseFilterStatus: parses valid status and falls back to all', () => {
  assert.equal(parseFilterStatus('watchlist'), 'watchlist');
  assert.equal(parseFilterStatus('watching'), 'watching');
  assert.equal(parseFilterStatus('completed'), 'completed');
  assert.equal(parseFilterStatus('paused'), 'paused');
  assert.equal(parseFilterStatus('dropped'), 'dropped');
  assert.equal(parseFilterStatus('all'), 'all');
  assert.equal(parseFilterStatus('ALL'), 'all');
  assert.equal(parseFilterStatus(undefined), 'all');
  assert.equal(parseFilterStatus(''), 'all');
  assert.equal(parseFilterStatus('invalid_status'), 'all');
});

test('parseSortOption: parses allowed sort options and falls back to recent', () => {
  assert.equal(parseSortOption('recent'), 'recent');
  assert.equal(parseSortOption('last_watched'), 'last_watched');
  assert.equal(parseSortOption('added'), 'added');
  assert.equal(parseSortOption('title'), 'title');
  assert.equal(parseSortOption('rating'), 'rating');
  assert.equal(parseSortOption('year'), 'year');
  assert.equal(parseSortOption(undefined), 'recent');
  assert.equal(parseSortOption(''), 'recent');
  assert.equal(parseSortOption('raw_sql_injection;--'), 'recent');
  assert.equal(parseSortOption('unsupported_key'), 'recent');
});

test('parsePageNumber: handles valid and invalid page parameters', () => {
  assert.equal(parsePageNumber('1'), 1);
  assert.equal(parsePageNumber('5'), 5);
  assert.equal(parsePageNumber('0'), 1);
  assert.equal(parsePageNumber('-10'), 1);
  assert.equal(parsePageNumber('abc'), 1);
  assert.equal(parsePageNumber(undefined), 1);
  assert.equal(parsePageNumber(''), 1);
});

test('buildLibraryUrl: constructs safe query strings preserving filters', () => {
  const base = '/dashboard/library';

  // Base with clean defaults
  assert.equal(
    buildLibraryUrl(base, {}, { status: 'all', sort: 'recent', page: 1 }),
    '/dashboard/library'
  );

  // Status and search
  assert.equal(
    buildLibraryUrl(base, { status: 'watching' }, { q: 'naruto' }),
    '/dashboard/library?status=watching&q=naruto'
  );

  // Pagination change preserves existing search & sort
  assert.equal(
    buildLibraryUrl(
      base,
      { status: 'completed', q: 'frieren', sort: 'rating', page: '2' },
      { page: 3 }
    ),
    '/dashboard/library?status=completed&q=frieren&sort=rating&page=3'
  );

  // Returning to page 1 omits page parameter
  assert.equal(
    buildLibraryUrl(
      base,
      { status: 'watchlist', page: '3' },
      { page: 1 }
    ),
    '/dashboard/library?status=watchlist'
  );
});

test('calculateStatusDates: applies transition date rules properly', () => {
  const now = '2026-09-08T12:00:00.000Z';

  // 1. watchlist -> watching: sets started_at
  const res1 = calculateStatusDates('watchlist', 'watching', null, null, now);
  assert.equal(res1.startedAt, now);
  assert.equal(res1.completedAt, null);

  // 2. watching -> watching (already started): keeps existing started_at
  const oldStarted = '2026-08-01T10:00:00.000Z';
  const res2 = calculateStatusDates('watching', 'watching', oldStarted, null, now);
  assert.equal(res2.startedAt, oldStarted);
  assert.equal(res2.completedAt, null);

  // 3. watching -> completed: sets completed_at
  const res3 = calculateStatusDates('watching', 'completed', oldStarted, null, now);
  assert.equal(res3.startedAt, oldStarted);
  assert.equal(res3.completedAt, now);

  // 4. completed -> watching: does NOT wipe completed_at history
  const oldCompleted = '2026-08-15T12:00:00.000Z';
  const res4 = calculateStatusDates('completed', 'watching', oldStarted, oldCompleted, now);
  assert.equal(res4.startedAt, oldStarted);
  assert.equal(res4.completedAt, oldCompleted);
});

test('updateRatingSchema: validates 0-10 with 0.5 step and null', () => {
  const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  // Valid ratings
  assert.equal(updateRatingSchema.safeParse({ entryId: validUuid, rating: 0 }).success, true);
  assert.equal(updateRatingSchema.safeParse({ entryId: validUuid, rating: 7.5 }).success, true);
  assert.equal(updateRatingSchema.safeParse({ entryId: validUuid, rating: 10 }).success, true);
  assert.equal(updateRatingSchema.safeParse({ entryId: validUuid, rating: null }).success, true);

  // Invalid ratings
  assert.equal(updateRatingSchema.safeParse({ entryId: validUuid, rating: -1 }).success, false);
  assert.equal(updateRatingSchema.safeParse({ entryId: validUuid, rating: 10.5 }).success, false);
  assert.equal(updateRatingSchema.safeParse({ entryId: validUuid, rating: 7.3 }).success, false);
  assert.equal(updateRatingSchema.safeParse({ entryId: 'invalid-uuid', rating: 8 }).success, false);
});

test('updateNotesSchema: validates maximum 2000 chars and trims', () => {
  const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  // Valid notes
  const ok = updateNotesSchema.safeParse({ entryId: validUuid, notes: 'Film yang luar biasa!' });
  assert.equal(ok.success, true);
  if (ok.success) {
    assert.equal(ok.data.notes, 'Film yang luar biasa!');
  }

  // Whitespace only transforms to null
  const ws = updateNotesSchema.safeParse({ entryId: validUuid, notes: '    ' });
  assert.equal(ws.success, true);
  if (ws.success) {
    assert.equal(ws.data.notes, null);
  }

  // Over 2000 chars fails
  const tooLong = 'a'.repeat(2001);
  assert.equal(updateNotesSchema.safeParse({ entryId: validUuid, notes: tooLong }).success, false);
});

test('updateStatusSchema: validates allowed enum values', () => {
  const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  assert.equal(updateStatusSchema.safeParse({ entryId: validUuid, status: 'watching' }).success, true);
  assert.equal(updateStatusSchema.safeParse({ entryId: validUuid, status: 'invalid_status' }).success, false);
});

test('format helpers: formatDuration & formatStatusLabel', () => {
  assert.equal(formatStatusLabel('watching'), 'Sedang Ditonton');
  assert.equal(formatStatusLabel('completed'), 'Selesai');
  assert.equal(formatStatusLabel('all'), 'Semua');

  assert.equal(formatDuration(142), '2j 22m');
  assert.equal(formatDuration(60), '1j');
  assert.equal(formatDuration(45), '45m');
  assert.equal(formatDuration(null), '-');
});

test('mapDbEntryToViewModel: correctly transforms database row to clean view model', () => {
  const dbRow = {
    id: 'entry-123',
    user_id: 'user-456',
    media_id: 'media-789',
    status: 'watching',
    rating: '8.5',
    is_favorite: true,
    notes: 'Sangat seru',
    started_at: '2026-09-01T00:00:00.000Z',
    completed_at: null,
    last_watched_at: '2026-09-08T00:00:00.000Z',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-08T00:00:00.000Z',
    media: {
      id: 'media-789',
      media_type: 'series',
      title: 'Frieren: Beyond Journey\'s End',
      original_title: 'Sousou no Frieren',
      release_year: 2023,
      runtime_minutes: 24,
      total_episodes: 28,
      poster_url: 'https://example.com/poster.jpg',
    },
    episode_progress: [
      {
        id: 'ep-1',
        library_entry_id: 'entry-123',
        season_number: 1,
        episode_number: 12,
        episode_title: 'A Real Mage',
        duration_seconds: 1440,
        progress_seconds: 1200,
        is_completed: false,
        last_watched_at: '2026-09-08T00:00:00.000Z',
        updated_at: '2026-09-08T00:00:00.000Z',
      },
    ],
  };

  const vm = mapDbEntryToViewModel(dbRow);
  assert.equal(vm.id, 'entry-123');
  assert.equal(vm.media.title, 'Frieren: Beyond Journey\'s End');
  assert.equal(vm.media.mediaType, 'series');
  assert.equal(vm.rating, 8.5);
  assert.equal(vm.isFavorite, true);
  assert.equal(vm.latestEpisodeProgress?.episodeNumber, 12);
  assert.equal(vm.episodeProgressCount, 1);
});
