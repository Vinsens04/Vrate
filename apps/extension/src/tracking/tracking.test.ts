import test from 'node:test';
import assert from 'node:assert/strict';

import { TimeAccounting } from './time-accounting.ts';
import { calculateVideoScore, findPrimaryVideo } from './player-selector.ts';
import { TrackingQueue, STORAGE_QUEUE_KEY } from './session-queue.ts';
import type { CheckpointTrackingRequest } from '@vrate/shared';

// ------------------------------------------------------------------------------
// Test Suite 1: TimeAccounting Monotonic Clock & Seek Protection
// ------------------------------------------------------------------------------

test('TimeAccounting: 1. Initializes with clean default values', () => {
  const ta = new TimeAccounting(0, 1200);
  const snap = ta.getSnapshot();

  assert.equal(snap.progressSeconds, 0);
  assert.equal(snap.durationSeconds, 1200);
  assert.equal(snap.watchedDeltaSeconds, 0);
  assert.equal(snap.totalWatchedSeconds, 0);
  assert.equal(snap.playbackRate, 1.0);
  assert.equal(snap.isPlaying, false);
  assert.equal(snap.isSeeking, false);
  assert.equal(snap.isEnded, false);
});

test('TimeAccounting: 2. Sanitizes NaN, Infinity, negative, and extreme inputs', () => {
  const ta = new TimeAccounting(-50, NaN);
  let snap = ta.getSnapshot();
  assert.equal(snap.progressSeconds, 0);
  assert.equal(snap.durationSeconds, null);

  ta.onPlay(-999);
  snap = ta.getSnapshot();
  assert.equal(snap.progressSeconds, 0);

  ta.onDurationChange(Infinity);
  snap = ta.getSnapshot();
  assert.equal(snap.durationSeconds, null);

  ta.onRateChange(100); // Beyond MAX_PLAYBACK_RATE (4.0)
  snap = ta.getSnapshot();
  assert.equal(snap.playbackRate, 1.0);

  ta.onRateChange(0.01); // Below MIN_PLAYBACK_RATE (0.25)
  snap = ta.getSnapshot();
  assert.equal(snap.playbackRate, 1.0);
});

test('TimeAccounting: 3. Accumulates watched seconds accurately during normal playback', () => {
  const ta = new TimeAccounting(10, 600);
  const t0 = 1000000;

  ta.onPlay(10, t0);
  ta.onTimeUpdate(12, 600, t0 + 2000); // 2s later
  ta.onTimeUpdate(14, 600, t0 + 4000); // 4s later

  const snap = ta.getSnapshot();
  assert.equal(snap.progressSeconds, 14);
  assert.equal(snap.watchedDeltaSeconds, 4);
  assert.equal(snap.totalWatchedSeconds, 4);
});

test('TimeAccounting: 4. Seek Protection: Forward seek NEVER increases watched seconds', () => {
  const ta = new TimeAccounting(10, 1200);
  const t0 = 1000000;

  ta.onPlay(10, t0);
  ta.onTimeUpdate(12, 1200, t0 + 2000); // watched 2s

  // User drags slider forward from 12s to 600s in 500ms
  ta.onSeeking(12);
  ta.onSeeked(600, t0 + 2500);

  const snapAfterSeek = ta.getSnapshot();
  assert.equal(snapAfterSeek.progressSeconds, 600);
  // Watched seconds MUST remain 2s! (Did not gain 588s)
  assert.equal(snapAfterSeek.watchedDeltaSeconds, 2);

  // Resuming normal playback from 600s
  ta.onTimeUpdate(602, 1200, t0 + 4500); // 2s playback from new position
  const snapAfterResume = ta.getSnapshot();
  assert.equal(snapAfterResume.progressSeconds, 602);
  assert.equal(snapAfterResume.watchedDeltaSeconds, 4); // 2s + 2s
});

test('TimeAccounting: 5. Seek Protection: Sudden jump without discrete seeking event is clamped', () => {
  const ta = new TimeAccounting(10, 1200);
  const t0 = 1000000;

  ta.onPlay(10, t0);
  // Video position jumps by 300 seconds in 1 wall-clock second (e.g. script skip)
  ta.onTimeUpdate(310, 1200, t0 + 1000);

  const snap = ta.getSnapshot();
  assert.equal(snap.progressSeconds, 310);
  // Watched delta must be capped to wallClockDelta * rate + grace, clamped to MAX_SINGLE_TICK_DELTA
  assert.ok(snap.watchedDeltaSeconds <= 5.0);
});

test('TimeAccounting: 6. Seek Protection: Backward seek does not increase watched delta', () => {
  const ta = new TimeAccounting(100, 1200);
  const t0 = 1000000;

  ta.onPlay(100, t0);
  ta.onTimeUpdate(105, 1200, t0 + 5000); // watched 5s

  // Seek back to 10s
  ta.onSeeking(105);
  ta.onSeeked(10, t0 + 5500);

  const snap = ta.getSnapshot();
  assert.equal(snap.progressSeconds, 10);
  assert.equal(snap.watchedDeltaSeconds, 5);
});

test('TimeAccounting: 7. Playback Rate Scaling: 1.5x and 2.0x correctly scales watched time', () => {
  const ta = new TimeAccounting(0, 1200);
  const t0 = 1000000;

  ta.onPlay(0, t0);
  ta.onRateChange(2.0); // 2x speed

  // In 2 wall-clock seconds, video plays 4 seconds of media
  ta.onTimeUpdate(4, 1200, t0 + 2000);

  const snap = ta.getSnapshot();
  assert.equal(snap.progressSeconds, 4);
  // Watched time at 2x speed for 2 wall clock seconds is 4s media
  assert.equal(snap.watchedDeltaSeconds, 4);
});

test('TimeAccounting: 8. Pause and Ended lifecycle stops accumulation', () => {
  const ta = new TimeAccounting(50, 60);
  const t0 = 1000000;

  ta.onPlay(50, t0);
  ta.onTimeUpdate(55, 60, t0 + 5000);
  ta.onPause(55, t0 + 5000);

  // Time passes while paused
  ta.onTimeUpdate(55, 60, t0 + 20000);

  let snap = ta.getSnapshot();
  assert.equal(snap.isPlaying, false);
  assert.equal(snap.watchedDeltaSeconds, 5);

  // On ended
  ta.onPlay(55, t0 + 21000);
  ta.onTimeUpdate(60, 60, t0 + 26000);
  ta.onEnded(60, t0 + 26000);

  snap = ta.getSnapshot();
  assert.equal(snap.isEnded, true);
  assert.equal(snap.isPlaying, false);
  assert.equal(snap.progressSeconds, 60);
});

test('TimeAccounting: 9. flushWatchedDelta resets delta and bounds to schema', () => {
  const ta = new TimeAccounting(0, 500);
  const t0 = 1000000;

  ta.onPlay(0, t0);
  ta.onTimeUpdate(15, 500, t0 + 15000);

  const flushed1 = ta.flushWatchedDelta();
  assert.ok(flushed1 > 0);

  // Second flush immediately after is 0
  const flushed2 = ta.flushWatchedDelta();
  assert.equal(flushed2, 0);

  const snap = ta.getSnapshot();
  assert.equal(snap.watchedDeltaSeconds, 0);
  assert.ok(snap.totalWatchedSeconds > 0);
});

// ------------------------------------------------------------------------------
// Test Suite 2: Player Scoring & Selection
// ------------------------------------------------------------------------------

test('Player Scoring: 10. Computes score and prefers larger, full-length content video', () => {
  // Mock full-length content video (1920x1080, 24 mins, playing)
  const mainVideo = {
    videoWidth: 1920,
    videoHeight: 1080,
    duration: 1440,
    paused: false,
    currentTime: 120,
    loop: false,
    muted: false,
    getBoundingClientRect: () => ({ width: 1280, height: 720 }),
  } as unknown as HTMLVideoElement;

  // Mock background looping animation (300x200, 15s duration, muted, loop)
  const bgAnimation = {
    videoWidth: 300,
    videoHeight: 200,
    duration: 15,
    paused: false,
    currentTime: 2,
    loop: true,
    muted: true,
    getBoundingClientRect: () => ({ width: 300, height: 200 }),
  } as unknown as HTMLVideoElement;

  const scoreMain = calculateVideoScore(mainVideo);
  const scoreBg = calculateVideoScore(bgAnimation);

  assert.ok(scoreMain > 500);
  assert.ok(scoreMain > scoreBg);
});

test('Player Scoring: 11. Short ad video (< 60s) receives penalty', () => {
  const adVideo = {
    videoWidth: 1280,
    videoHeight: 720,
    duration: 15, // 15 seconds ad
    paused: false,
    currentTime: 2,
    getBoundingClientRect: () => ({ width: 640, height: 360 }),
  } as unknown as HTMLVideoElement;

  const fullVideo = {
    videoWidth: 1280,
    videoHeight: 720,
    duration: 1400, // 23 mins episode
    paused: false,
    currentTime: 2,
    getBoundingClientRect: () => ({ width: 640, height: 360 }),
  } as unknown as HTMLVideoElement;

  const adScore = calculateVideoScore(adVideo);
  const fullScore = calculateVideoScore(fullVideo);

  assert.ok(fullScore > adScore);
});

// ------------------------------------------------------------------------------
// Test Suite 3: Offline Retry Queue
// ------------------------------------------------------------------------------

test('TrackingQueue: 12. Enqueue, merge deltas for same session, and enforce max size', async () => {
  // Setup mock chrome.storage.local
  const mockStorage: Record<string, unknown> = {};
  (globalThis as any).chrome = {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: mockStorage[key] }),
        set: async (obj: Record<string, unknown>) => {
          Object.assign(mockStorage, obj);
        },
        remove: async (key: string) => {
          delete mockStorage[key];
        },
      },
    },
  };

  await TrackingQueue.clear();

  const req1: CheckpointTrackingRequest = {
    clientSessionId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    libraryEntryId: '11111111-2222-3333-4444-555555555555',
    progressSeconds: 30,
    durationSeconds: 1200,
    watchedDeltaSeconds: 15,
    playbackRate: 1.0,
    eventType: 'checkpoint',
    isEnded: false,
  };

  await TrackingQueue.enqueue(req1);
  assert.equal(await TrackingQueue.size(), 1);

  // Enqueue second checkpoint for the SAME session
  const req2: CheckpointTrackingRequest = {
    clientSessionId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    libraryEntryId: '11111111-2222-3333-4444-555555555555',
    progressSeconds: 45,
    durationSeconds: 1200,
    watchedDeltaSeconds: 15,
    playbackRate: 1.0,
    eventType: 'checkpoint',
    isEnded: false,
  };

  await TrackingQueue.enqueue(req2);
  // Count should still be 1 because it merged into existing item
  assert.equal(await TrackingQueue.size(), 1);

  const items = await TrackingQueue.getAll();
  assert.equal(items[0]?.request.progressSeconds, 45);
  // Merged watchedDeltaSeconds = 15 + 15 = 30
  assert.equal(items[0]?.request.watchedDeltaSeconds, 30);

  // Test exponential backoff
  await TrackingQueue.recordAttempt(items[0]!.id, 'HTTP 500');
  const itemsAfterAttempt = await TrackingQueue.getAll();
  assert.equal(itemsAfterAttempt[0]?.attempts, 1);
  assert.ok(itemsAfterAttempt[0]!.nextAttemptAt > Date.now());

  // Clean up mock
  delete (globalThis as any).chrome;
});

// ------------------------------------------------------------------------------
// Test Suite 4: Single-Video Selection & In-Memory Real-time State
// ------------------------------------------------------------------------------

test('Player Selector: 13. Selects single video element even when paused at 0:00 without metadata', () => {
  const mockVideo = {
    currentTime: 0,
    duration: NaN,
    videoWidth: 0,
    videoHeight: 0,
    paused: true,
    src: 'https://example.com/stream.m3u8',
    getBoundingClientRect: () => ({ width: 0, height: 0 }),
    querySelectorAll: () => [],
  } as unknown as HTMLVideoElement;

  const mockDocument = {
    querySelectorAll: (selector: string) => {
      if (selector === 'video') return [mockVideo];
      return [];
    },
  } as unknown as Document;

  const selected = findPrimaryVideo(mockDocument);
  assert.equal(selected, mockVideo);
});

test('Tab Tracker: 14. Real-time in-memory position update does not require network', async () => {
  const { updateTabTrackingPosition } = await import('./tab-tracker-state.ts');

  // Inject a mock active session in memory
  const mockTabId = 99999;
  updateTabTrackingPosition(mockTabId, 45, 1440);
});

test('Tab Tracker: 15. AUTO_TRACK_CONFIRMATION_SECONDS constant is 30', async () => {
  const { AUTO_TRACK_CONFIRMATION_SECONDS } = await import('@vrate/shared');
  assert.equal(AUTO_TRACK_CONFIRMATION_SECONDS, 30);
});

test('Tab Tracker: 16. Late event rejection via sessionGeneration', async () => {
  const {
    handleCandidateAutoTracking,
    getTabTrackingSession,
    updateTabTrackingPosition,
    handleCheckpointFromTab,
    stopTrackingSession,
  } = await import('./tab-tracker-state.ts');

  const tabId = 88881;
  const mockCandidate = {
    detectorId: 'miruro',
    provider: 'anilist' as const,
    externalId: '12345',
    titleHint: 'Attack on Titan',
    mediaType: 'series' as const,
    episodeNumber: 1,
    seasonNumber: 1,
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
    confidence: 0.95,
    evidence: ['url_external_id' as const],
    detectedAt: new Date().toISOString(),
  };

  await handleCandidateAutoTracking(tabId, 'https://miruro.bz/watch?id=12345&ep=1', mockCandidate);
  const session = getTabTrackingSession(tabId);
  assert.ok(session);
  const currentGen = session.sessionGeneration;
  assert.ok(currentGen > 0);

  // Late update with obsolete generation should be dropped
  updateTabTrackingPosition(tabId, 999, 1440, currentGen - 1);
  assert.equal(session.progressSeconds, 0);

  // Correct generation updates in-memory position
  updateTabTrackingPosition(tabId, 50, 1440, currentGen);
  assert.equal(session.progressSeconds, 50);

  // Late checkpoint with old generation should be dropped
  await handleCheckpointFromTab(tabId, {
    progressSeconds: 100,
    durationSeconds: 1440,
    watchedDeltaSeconds: 5,
    playbackRate: 1.0,
    eventType: 'checkpoint',
    isEnded: false,
    generation: currentGen - 1,
  });
  assert.equal(session.progressSeconds, 50);
  assert.equal(session.watchedSeconds, 0);

  await stopTrackingSession(tabId, 'user_stop');
});

test('Tab Tracker: 17. Automatic episode transition increments generation and resets accumulator', async () => {
  const {
    handleCandidateAutoTracking,
    getTabTrackingSession,
    handleCheckpointFromTab,
    stopTrackingSession,
  } = await import('./tab-tracker-state.ts');

  const tabId = 88882;
  const ep1Candidate = {
    detectorId: 'miruro',
    provider: 'anilist' as const,
    externalId: '54321',
    titleHint: 'Frieren',
    mediaType: 'series' as const,
    episodeNumber: 1,
    seasonNumber: 1,
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
    confidence: 0.95,
    evidence: ['url_external_id' as const],
    detectedAt: new Date().toISOString(),
  };

  await handleCandidateAutoTracking(tabId, 'https://miruro.bz/watch?id=54321&ep=1', ep1Candidate);
  const session1 = getTabTrackingSession(tabId);
  assert.ok(session1);
  const gen1 = session1.sessionGeneration;
  assert.equal(session1.episodeNumber, 1);
  assert.equal(session1.accumulatedRealWatchedSeconds, 0);

  // Watch 10 seconds of episode 1 (not confirmed yet)
  await handleCheckpointFromTab(tabId, {
    progressSeconds: 10,
    durationSeconds: 1440,
    watchedDeltaSeconds: 10,
    playbackRate: 1.0,
    eventType: 'checkpoint',
    isEnded: false,
    generation: gen1,
  });
  assert.equal(session1.accumulatedRealWatchedSeconds, 10);
  assert.equal(session1.isPersistedToLibrary, false);

  // Transition to Episode 2
  const ep2Candidate = {
    ...ep1Candidate,
    episodeNumber: 2,
  };

  await handleCandidateAutoTracking(tabId, 'https://miruro.bz/watch?id=54321&ep=2', ep2Candidate);
  const session2 = getTabTrackingSession(tabId);
  assert.ok(session2);
  assert.equal(session2.episodeNumber, 2);
  assert.ok(session2.sessionGeneration > gen1);
  assert.equal(session2.accumulatedRealWatchedSeconds, 0);
  assert.equal(session2.isPersistedToLibrary, false);

  await stopTrackingSession(tabId, 'user_stop');
});

test('Tab Tracker: 18. Short video (< 60s) ignored by checkpoint handler', async () => {
  const {
    handleCandidateAutoTracking,
    getTabTrackingSession,
    handleCheckpointFromTab,
    stopTrackingSession,
  } = await import('./tab-tracker-state.ts');

  const tabId = 88883;
  const candidate = {
    detectorId: 'miruro',
    provider: 'anilist' as const,
    externalId: '99999',
    titleHint: 'Short Video Test',
    mediaType: 'series' as const,
    episodeNumber: 1,
    seasonNumber: 1,
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
    confidence: 0.95,
    evidence: ['url_external_id' as const],
    detectedAt: new Date().toISOString(),
  };

  await handleCandidateAutoTracking(tabId, 'https://miruro.bz/watch?id=99999&ep=1', candidate);
  const session = getTabTrackingSession(tabId);
  assert.ok(session);

  // Send checkpoint for a 30-second bumper/ad
  await handleCheckpointFromTab(tabId, {
    progressSeconds: 15,
    durationSeconds: 30, // < 60s
    watchedDeltaSeconds: 15,
    playbackRate: 1.0,
    eventType: 'checkpoint',
    isEnded: false,
    generation: session.sessionGeneration,
  });

  assert.equal(session.accumulatedRealWatchedSeconds, 0);
  assert.equal(session.progressSeconds, 0);

  await stopTrackingSession(tabId, 'user_stop');
});

test('Tab Tracker: 19. Threshold enforcement: In-memory before 30s confirmation', async () => {
  const {
    handleCandidateAutoTracking,
    getTabTrackingSession,
    handleCheckpointFromTab,
    stopTrackingSession,
  } = await import('./tab-tracker-state.ts');

  const tabId = 88884;
  const candidate = {
    detectorId: 'miruro',
    provider: 'anilist' as const,
    externalId: '77777',
    titleHint: 'Threshold Test',
    mediaType: 'series' as const,
    episodeNumber: 1,
    seasonNumber: 1,
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
    confidence: 0.95,
    evidence: ['url_external_id' as const],
    detectedAt: new Date().toISOString(),
  };

  await handleCandidateAutoTracking(tabId, 'https://miruro.bz/watch?id=77777&ep=1', candidate);
  const session = getTabTrackingSession(tabId);
  assert.ok(session);

  // Watch 25s (under 30s)
  await handleCheckpointFromTab(tabId, {
    progressSeconds: 25,
    durationSeconds: 1200,
    watchedDeltaSeconds: 25,
    playbackRate: 1.0,
    eventType: 'checkpoint',
    isEnded: false,
    generation: session.sessionGeneration,
  });

  assert.equal(session.accumulatedRealWatchedSeconds, 25);
  assert.equal(session.isPersistedToLibrary, false);
  assert.equal(session.libraryEntryId, '');

  await stopTrackingSession(tabId, 'user_stop');
});

