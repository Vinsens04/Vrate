import test from 'node:test';
import assert from 'node:assert/strict';

import {
  startTrackingRequestSchema,
  checkpointTrackingRequestSchema,
  stopTrackingRequestSchema,
} from '@vrate/shared';
import { extractBearerToken } from './extract-token.ts';
import { isOriginAllowed } from './cors.ts';
import {
  recordStartSession,
  recordCheckpoint,
  recordStopSession,
  markEpisodeCompleted,
  deleteEpisodeProgress,
  correctEpisodeProgress,
} from '../../features/library/services/tracking-service.ts';
import {
  formatEpisodeBadge,
  mapDbEntryToViewModel,
} from '../../features/library/utils/library-logic.ts';

// ------------------------------------------------------------------------------
// Test Suite 4: Extension Tracking API Schemas & Security (Tests 1 - 6)
// ------------------------------------------------------------------------------

test('Tracking API: 1. startTrackingRequestSchema validates UUIDs and bounds', () => {
  const valid = startTrackingRequestSchema.safeParse({
    clientSessionId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    libraryEntryId: '11111111-2222-3333-4444-555555555555',
    mediaId: '22222222-3333-4444-5555-666666666666',
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
    initialProgressSeconds: 0,
    durationSeconds: 1440,
  });
  assert.equal(valid.success, true);

  // Invalid UUID for clientSessionId
  const invalidUuid = startTrackingRequestSchema.safeParse({
    clientSessionId: 'not-a-uuid',
    libraryEntryId: '11111111-2222-3333-4444-555555555555',
    mediaId: '22222222-3333-4444-5555-666666666666',
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
  });
  assert.equal(invalidUuid.success, false);

  // Negative progress
  const negProgress = startTrackingRequestSchema.safeParse({
    clientSessionId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    libraryEntryId: '11111111-2222-3333-4444-555555555555',
    mediaId: '22222222-3333-4444-5555-666666666666',
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
    initialProgressSeconds: -10,
  });
  assert.equal(negProgress.success, false);
});

test('Tracking API: 2. checkpointTrackingRequestSchema bounds delta and rate', () => {
  const valid = checkpointTrackingRequestSchema.safeParse({
    clientSessionId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    libraryEntryId: '11111111-2222-3333-4444-555555555555',
    progressSeconds: 120,
    durationSeconds: 1440,
    watchedDeltaSeconds: 15,
    playbackRate: 1.25,
    eventType: 'checkpoint',
  });
  assert.equal(valid.success, true);

  // Delta > 300s rejected
  const hugeDelta = checkpointTrackingRequestSchema.safeParse({
    clientSessionId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    libraryEntryId: '11111111-2222-3333-4444-555555555555',
    progressSeconds: 120,
    watchedDeltaSeconds: 500, // Max is 300
  });
  assert.equal(hugeDelta.success, false);

  // Negative delta rejected
  const negDelta = checkpointTrackingRequestSchema.safeParse({
    clientSessionId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    libraryEntryId: '11111111-2222-3333-4444-555555555555',
    progressSeconds: 120,
    watchedDeltaSeconds: -5,
  });
  assert.equal(negDelta.success, false);

  // Extreme playbackRate rejected
  const extremeRate = checkpointTrackingRequestSchema.safeParse({
    clientSessionId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    libraryEntryId: '11111111-2222-3333-4444-555555555555',
    progressSeconds: 120,
    watchedDeltaSeconds: 15,
    playbackRate: 16.0, // Max is 4.0
  });
  assert.equal(extremeRate.success, false);
});

test('Tracking API: 3. Unauthenticated requests and unauthorized origins are rejected', () => {
  const tokenExtraction = extractBearerToken(null);
  assert.equal(tokenExtraction.success, false);
  assert.equal(tokenExtraction.status, 401);

  // Check origin protection with registered whitelist
  process.env.EXTENSION_ALLOWED_ORIGINS = 'http://localhost:3000,chrome-extension://test-id';
  assert.equal(isOriginAllowed('https://malicious-site.com'), false);
  assert.equal(isOriginAllowed('http://localhost:3000'), true);
});

// ------------------------------------------------------------------------------
// Test Suite 5: Tracking Service Logic (State Transitions & Auto-Complete)
// ------------------------------------------------------------------------------

function createMockSupabase(initialData: {
  entries?: any[];
  episodes?: any[];
  sessions?: any[];
  settings?: any;
}) {
  const entries = initialData.entries || [];
  const episodes = initialData.episodes || [];
  const sessions = initialData.sessions || [];
  const settings = initialData.settings || { auto_complete_threshold: 90 };

  return {
    from: (table: string) => {
      let currentTable = table;
      let selectedFields = '';
      let filters: Array<{ field: string; val: any; op: string }> = [];
      let updatePayload: any = null;
      let insertPayload: any = null;
      let isDelete = false;

      const builder: any = {
        select: (f: string) => {
          selectedFields = f;
          return builder;
        },
        delete: () => {
          isDelete = true;
          return builder;
        },
        insert: (data: any) => {
          insertPayload = data;
          if (currentTable === 'episode_progress') {
            const row = { id: 'ep-' + Math.random(), ...data };
            episodes.push(row);
            return {
              select: () => ({
                single: async () => ({ data: row, error: null }),
              }),
            };
          }
          if (currentTable === 'watch_sessions') {
            const row = { id: 'sess-' + Math.random(), ...data };
            sessions.push(row);
            return {
              select: () => ({
                single: async () => ({ data: row, error: null }),
              }),
            };
          }
          return { data: null, error: null };
        },
        update: (data: any) => {
          updatePayload = data;
          return builder;
        },
        eq: (field: string, val: any) => {
          filters.push({ field, val, op: 'eq' });
          return builder;
        },
        is: (field: string, val: any) => {
          filters.push({ field, val, op: 'is' });
          return builder;
        },
        order: () => builder,
        limit: () => builder,
        then: (resolve: (val: any) => void) => {
          if (isDelete && currentTable === 'episode_progress') {
            const idx = episodes.findIndex((ep) =>
              filters.every((f) => {
                if (f.op === 'is' && f.val === null) return ep[f.field] === null || ep[f.field] === undefined;
                return ep[f.field] === f.val;
              })
            );
            if (idx !== -1) {
              episodes.splice(idx, 1);
            }
          }
          if (updatePayload && currentTable === 'library_entries') {
            const match = entries.find((e) => filters.every((f) => e[f.field] === f.val));
            if (match) {
              Object.assign(match, updatePayload);
            }
          }
          if (updatePayload && currentTable === 'episode_progress') {
            const match = episodes.find((ep) => filters.every((f) => ep[f.field] === f.val));
            if (match) {
              Object.assign(match, updatePayload);
            }
          }
          if (updatePayload && currentTable === 'watch_sessions') {
            const match = sessions.find((s) => filters.every((f) => s[f.field] === f.val));
            if (match) {
              Object.assign(match, updatePayload);
            }
          }
          resolve({ data: null, error: null });
        },
        single: async () => {
          if (currentTable === 'library_entries') {
            const match = entries.find((e) => filters.every((f) => e[f.field] === f.val));
            if (updatePayload && match) {
              Object.assign(match, updatePayload);
            }
            return { data: match || null, error: match ? null : { message: 'Not found' } };
          }
          return { data: null, error: null };
        },
        maybeSingle: async () => {
          if (currentTable === 'user_settings') {
            return { data: settings, error: null };
          }
          if (currentTable === 'episode_progress') {
            const match = episodes.find((ep) =>
              filters.every((f) => {
                if (f.op === 'is' && f.val === null) return ep[f.field] === null || ep[f.field] === undefined;
                return ep[f.field] === f.val;
              })
            );
            if (updatePayload && match) {
              Object.assign(match, updatePayload);
            }
            return { data: match || null, error: null };
          }
          if (currentTable === 'watch_sessions') {
            const match = sessions.find((s) => filters.every((f) => s[f.field] === f.val));
            return { data: match || null, error: null };
          }
          return { data: null, error: null };
        },
      };

      return builder;
    },
    _state: { entries, episodes, sessions },
  };
}

test('Tracking Service: 4. Starting session transitions watchlist to watching', async () => {
  const mockEntry = {
    id: '11111111-2222-3333-4444-555555555555',
    user_id: 'usr-1',
    status: 'watchlist',
    started_at: null,
    completed_at: null,
    media_id: 'med-1',
  };

  const mockDb = createMockSupabase({ entries: [mockEntry] });

  const result = await recordStartSession(mockDb as any, 'usr-1', {
    clientSessionId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    libraryEntryId: mockEntry.id,
    mediaId: 'med-1',
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
    initialProgressSeconds: 0,
    durationSeconds: 1440,
  });

  assert.equal(result.success, true);
  // Entry status must now be 'watching'
  assert.equal(mockEntry.status, 'watching');
  assert.ok(mockEntry.started_at !== null);
});

test('Tracking Service: 5. Movie at 90% progress auto-completes and sets completed_at', async () => {
  const mockEntry = {
    id: '11111111-2222-3333-4444-555555555555',
    user_id: 'usr-1',
    status: 'watching',
    started_at: '2026-09-08T00:00:00Z',
    completed_at: null,
    media_id: 'med-movie',
    media: { id: 'med-movie', media_type: 'movie', total_episodes: 1 },
  };

  const mockDb = createMockSupabase({ entries: [mockEntry] });

  // Checkpoint at 90% (900s of 1000s)
  const result = await recordCheckpoint(mockDb as any, 'usr-1', {
    clientSessionId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    libraryEntryId: mockEntry.id,
    progressSeconds: 900,
    durationSeconds: 1000,
    watchedDeltaSeconds: 15,
    playbackRate: 1.0,
    eventType: 'checkpoint',
    isEnded: false,
  });

  assert.equal(result.success, true);
  assert.equal(result.isCompleted, true);
  assert.equal(result.progressPercent, 90);
  assert.equal(mockEntry.status, 'completed');
  assert.ok(mockEntry.completed_at !== null);
});

test('Tracking Service: 6. NEVER DOWNGRADE: Completed movie is never downgraded back to watching', async () => {
  const mockEntry = {
    id: '11111111-2222-3333-4444-555555555555',
    user_id: 'usr-1',
    status: 'completed',
    started_at: '2026-09-08T00:00:00Z',
    completed_at: '2026-09-09T00:00:00Z',
    media_id: 'med-movie',
    media: { id: 'med-movie', media_type: 'movie', total_episodes: 1 },
  };

  const mockDb = createMockSupabase({ entries: [mockEntry] });

  // User rewinds back to 10s (e.g. rewatching intro)
  const result = await recordCheckpoint(mockDb as any, 'usr-1', {
    clientSessionId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    libraryEntryId: mockEntry.id,
    progressSeconds: 10,
    durationSeconds: 1000,
    watchedDeltaSeconds: 10,
    playbackRate: 1.0,
    eventType: 'checkpoint',
    isEnded: false,
  });

  assert.equal(result.success, true);
  // Status MUST stay 'completed'
  assert.equal(mockEntry.status, 'completed');
  assert.equal(mockEntry.completed_at, '2026-09-09T00:00:00Z');
});

test('Tracking Service: 7. Series episode auto-completes episode without whole series if episodes remain', async () => {
  const mockEntry = {
    id: '11111111-2222-3333-4444-555555555555',
    user_id: 'usr-1',
    status: 'watching',
    started_at: '2026-09-08T00:00:00Z',
    completed_at: null,
    media_id: 'med-series',
    media: { id: 'med-series', media_type: 'series', total_episodes: 12 },
  };

  const mockDb = createMockSupabase({ entries: [mockEntry] });

  // Finish Episode 1 (ended = true)
  const result = await recordCheckpoint(mockDb as any, 'usr-1', {
    clientSessionId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    libraryEntryId: mockEntry.id,
    episodeNumber: 1,
    progressSeconds: 1440,
    durationSeconds: 1440,
    watchedDeltaSeconds: 15,
    playbackRate: 1.0,
    eventType: 'ended',
    isEnded: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.isCompleted, true);
  // Entire series is still watching (only 1 of 12 episodes completed)
  assert.equal(mockEntry.status, 'watching');
  assert.equal(mockEntry.completed_at, null);
});

test('Tracking Service: 8. markEpisodeCompleted explicitly marks episode complete', async () => {
  const mockEntry = {
    id: '11111111-2222-3333-4444-555555555555',
    user_id: 'usr-1',
    status: 'watching',
    started_at: '2026-09-08T00:00:00Z',
    completed_at: null,
    media_id: 'med-series',
    media: { id: 'med-series', media_type: 'series', total_episodes: 12 },
  };

  const mockEp = {
    id: 'ep-1',
    library_entry_id: mockEntry.id,
    episode_number: 2,
    season_number: null,
    progress_seconds: 300,
    duration_seconds: 1200,
    progress_percent: 25,
    is_completed: false,
  };

  const mockDb = createMockSupabase({
    entries: [mockEntry],
    episodes: [mockEp],
  });

  const res = await markEpisodeCompleted(mockDb as any, 'usr-1', {
    libraryEntryId: mockEntry.id,
    episodeNumber: 2,
  });

  assert.equal(res.success, true);
  assert.equal(mockEp.is_completed, true);
  assert.equal(mockEp.progress_percent, 100);
});

test('Tracking Service: 9. deleteEpisodeProgress clears progress and resets status', async () => {
  const mockEntry = {
    id: '11111111-2222-3333-4444-555555555555',
    user_id: 'usr-1',
    status: 'watching',
    started_at: '2026-09-08T00:00:00Z',
    completed_at: null,
    media_id: 'med-series',
    media: { id: 'med-series', media_type: 'series', total_episodes: 12 },
  };

  const mockEp = {
    id: 'ep-1',
    library_entry_id: mockEntry.id,
    episode_number: 3,
    season_number: null,
    progress_seconds: 900,
    duration_seconds: 1200,
    progress_percent: 75,
    is_completed: true,
  };

  const episodeList = [mockEp];
  const mockDb = createMockSupabase({
    entries: [mockEntry],
    episodes: episodeList,
  });

  const res = await deleteEpisodeProgress(mockDb as any, 'usr-1', {
    libraryEntryId: mockEntry.id,
    episodeNumber: 3,
  });

  assert.equal(res.success, true);
  assert.equal(episodeList.length, 0);
});

test('Tracking Service: 10. correctEpisodeProgress updates episode number', async () => {
  const mockEntry = {
    id: '11111111-2222-3333-4444-555555555555',
    user_id: 'usr-1',
    status: 'watching',
    started_at: '2026-09-08T00:00:00Z',
    completed_at: null,
    media_id: 'med-series',
    media: { id: 'med-series', media_type: 'series', total_episodes: 12 },
  };

  const mockEp = {
    id: 'ep-1',
    library_entry_id: mockEntry.id,
    episode_number: 1, // Detected wrong as 1
    season_number: null,
    progress_seconds: 300,
    duration_seconds: 1200,
    progress_percent: 25,
    is_completed: false,
  };

  const mockDb = createMockSupabase({
    entries: [mockEntry],
    episodes: [mockEp],
  });

  const res = await correctEpisodeProgress(mockDb as any, 'usr-1', {
    libraryEntryId: mockEntry.id,
    currentEpisodeNumber: 1,
    correctedEpisodeNumber: 2, // Corrected to 2
  });

  assert.equal(res.success, true);
  assert.equal(mockEp.episode_number, 2);
});

test('Library Logic: 11. formatEpisodeBadge correctly formats movie, single season, multi-season, and completion', () => {
  // Movie: always null
  const movieBadge = formatEpisodeBadge('movie', {
    id: 'ep-1',
    libraryEntryId: 'entry-1',
    episodeNumber: 1,
    seasonNumber: null,
    progressSeconds: 500,
    durationSeconds: 7200,
    progressPercent: 7,
    isCompleted: false,
    lastWatchedAt: '2026-09-09T00:00:00Z',
    updatedAt: '2026-09-09T00:00:00Z',
  });
  assert.equal(movieBadge, null);

  // Null progress: always null
  assert.equal(formatEpisodeBadge('series', null), null);

  // Single season anime with progress: "E2 • 34%"
  const animeProgressBadge = formatEpisodeBadge('series', {
    id: 'ep-2',
    libraryEntryId: 'entry-1',
    episodeNumber: 2,
    seasonNumber: 1,
    progressSeconds: 408,
    durationSeconds: 1200,
    progressPercent: 34,
    isCompleted: false,
    lastWatchedAt: '2026-09-09T00:00:00Z',
    updatedAt: '2026-09-09T00:00:00Z',
  }, 1);
  assert.equal(animeProgressBadge, 'E2 • 34%');

  // Multi-season series with progress: "S2E2 • 34%"
  const multiSeasonBadge = formatEpisodeBadge('series', {
    id: 'ep-3',
    libraryEntryId: 'entry-1',
    episodeNumber: 2,
    seasonNumber: 2,
    progressSeconds: 408,
    durationSeconds: 1200,
    progressPercent: 34,
    isCompleted: false,
    lastWatchedAt: '2026-09-09T00:00:00Z',
    updatedAt: '2026-09-09T00:00:00Z',
  }, 3);
  assert.equal(multiSeasonBadge, 'S2E2 • 34%');

  // Completed episode: "E2 • Selesai"
  const completedBadge = formatEpisodeBadge('series', {
    id: 'ep-4',
    libraryEntryId: 'entry-1',
    episodeNumber: 2,
    seasonNumber: null,
    progressSeconds: 1200,
    durationSeconds: 1200,
    progressPercent: 100,
    isCompleted: true,
    lastWatchedAt: '2026-09-09T00:00:00Z',
    updatedAt: '2026-09-09T00:00:00Z',
  });
  assert.equal(completedBadge, 'E2 • Selesai');
});

test('Library Logic: 12. mapDbEntryToViewModel selects latestEpisodeProgress by last_watched_at DESC, not highest episode', () => {
  const dbRow = {
    id: 'entry-1',
    user_id: 'usr-1',
    media_id: 'med-1',
    status: 'watching',
    rating: null,
    is_favorite: false,
    notes: null,
    started_at: '2026-09-01T00:00:00Z',
    completed_at: null,
    last_watched_at: '2026-09-09T12:00:00Z',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-09T12:00:00Z',
    media: {
      id: 'med-1',
      title: 'Test Anime',
      media_type: 'series',
      total_episodes: 24,
      total_seasons: 1,
    },
    episode_progress: [
      {
        id: 'ep-10',
        episode_number: 10, // Higher number, but watched earlier
        season_number: null,
        progress_seconds: 1200,
        duration_seconds: 1200,
        progress_percent: 100,
        is_completed: true,
        last_watched_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
      {
        id: 'ep-2',
        episode_number: 2, // Lower number, but watched recently
        season_number: null,
        progress_seconds: 400,
        duration_seconds: 1200,
        progress_percent: 33,
        is_completed: false,
        last_watched_at: '2026-09-09T12:00:00Z',
        updated_at: '2026-09-09T12:00:00Z',
      },
    ],
  };

  const viewModel = mapDbEntryToViewModel(dbRow as any);
  assert.ok(viewModel.latestEpisodeProgress);
  // Must select ep 2, NOT ep 10!
  assert.equal(viewModel.latestEpisodeProgress.episodeNumber, 2);
});

