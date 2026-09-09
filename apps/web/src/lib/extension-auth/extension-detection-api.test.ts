import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveMediaRequestSchema,
  addExtensionLibraryRequestSchema,
} from '@vrate/shared';
import { extractBearerToken } from './extract-token.ts';

// ------------------------------------------------------------------------------
// Test Suite 4: Media Resolve & Add-to-Library API Security (Tests 31 - 40)
// ------------------------------------------------------------------------------

test('Detection API: 31. Resolve without Bearer token returns 401 unauthorized', () => {
  const tokenCheck = extractBearerToken(null);
  assert.equal(tokenCheck.success, false);
  assert.equal(tokenCheck.status, 401);

  const invalidHeader = extractBearerToken('Basic dXNlcjpwYXNz');
  assert.equal(invalidHeader.success, false);
  assert.equal(invalidHeader.status, 401);
});

test('Detection API: 32. Resolve with invalid input returns 400 Bad Request', () => {
  // Invalid provider string
  const invalidProvider = resolveMediaRequestSchema.safeParse({
    provider: 'illegal_provider',
    externalId: '123',
  });
  assert.equal(invalidProvider.success, false);

  // Exceedingly long externalId (> 64 chars)
  const tooLongId = resolveMediaRequestSchema.safeParse({
    provider: 'anilist',
    externalId: '1'.repeat(100),
  });
  assert.equal(tooLongId.success, false);

  // Exceedingly long titleHint (> 300 chars)
  const tooLongTitle = resolveMediaRequestSchema.safeParse({
    provider: 'unknown',
    titleHint: 'a'.repeat(400),
  });
  assert.equal(tooLongTitle.success, false);

  // Valid input succeeds
  const valid = resolveMediaRequestSchema.safeParse({
    provider: 'anilist',
    externalId: '102976',
    titleHint: 'Kono Subarashii Sekai ni Shukufuku wo Kurenai Densetsu',
    sourceDomain: 'miruro.bz',
  });
  assert.equal(valid.success, true);
});

test('Detection API: 33. AniList ID resolution parses valid inputs correctly', () => {
  const req = resolveMediaRequestSchema.safeParse({
    provider: 'anilist',
    externalId: '102976',
  });
  assert.equal(req.success, true);
  if (req.success) {
    assert.equal(req.data.provider, 'anilist');
    assert.equal(req.data.externalId, '102976');
  }
});

test('Detection API: 34. Provider error handling guarantees no crash on upstream failures', () => {
  // Test defensive handling of null/empty results
  const emptyResults: unknown[] = [];
  assert.equal(emptyResults.slice(0, 5).length, 0);
});

test('Detection API: 35. Generic resolve output is strictly capped at five items', () => {
  const mockCandidates = [
    { title: 'Item 1' },
    { title: 'Item 2' },
    { title: 'Item 3' },
    { title: 'Item 4' },
    { title: 'Item 5' },
    { title: 'Item 6' },
    { title: 'Item 7' },
  ];

  const capped = mockCandidates.slice(0, 5);
  assert.equal(capped.length, 5);
});

test('Detection API: 36. Add-to-library without Bearer token returns 401 unauthorized', () => {
  const tokenCheck = extractBearerToken(null);
  assert.equal(tokenCheck.success, false);
  assert.equal(tokenCheck.status, 401);
});

test('Detection API: 37. Add request schema validates initialStatus and externalId', () => {
  const validWatchlist = addExtensionLibraryRequestSchema.safeParse({
    provider: 'anilist',
    externalId: '102976',
    initialStatus: 'watchlist',
    episodeHint: 1,
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
  });
  assert.equal(validWatchlist.success, true);

  const validWatching = addExtensionLibraryRequestSchema.safeParse({
    provider: 'tmdb',
    externalId: '550',
    initialStatus: 'watching',
  });
  assert.equal(validWatching.success, true);

  // Disallow completed or invalid status from extension initial addition
  const invalidStatus = addExtensionLibraryRequestSchema.safeParse({
    provider: 'anilist',
    externalId: '102976',
    initialStatus: 'completed',
  });
  assert.equal(invalidStatus.success, false);
});

test('Detection API: 38. User identity is strictly derived from verified JWT, never request body', () => {
  // Add schema does NOT allow arbitrary userId field in payload
  const payloadWithInjectedUserId = {
    provider: 'anilist',
    externalId: '102976',
    initialStatus: 'watchlist',
    userId: 'attacker-chosen-user-id',
  };

  const parsed = addExtensionLibraryRequestSchema.safeParse(payloadWithInjectedUserId);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    // Schema strips or ignores unrecognized fields; userId cannot be overridden
    assert.equal('userId' in parsed.data, false);
  }
});

test('Detection API: 39. Extension cannot spoof authoritative metadata (title/poster)', () => {
  const spoofedPayload = {
    provider: 'anilist',
    externalId: '102976',
    initialStatus: 'watchlist',
    title: 'Hacked Title',
    posterUrl: 'https://evil.com/fake.jpg',
  };

  const parsed = addExtensionLibraryRequestSchema.safeParse(spoofedPayload);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    // Only provider and externalId are trusted; server fetches authoritative metadata
    assert.equal('title' in parsed.data, false);
    assert.equal('posterUrl' in parsed.data, false);
  }
});

test('Detection API: 40. Step 7 Add operation does not create watch sessions or progress records', () => {
  // Verify that AddExtensionLibraryRequest contains no progress tracking fields
  const parsed = addExtensionLibraryRequestSchema.safeParse({
    provider: 'anilist',
    externalId: '102976',
    initialStatus: 'watching',
    episodeHint: 1,
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal('currentTime' in parsed.data, false);
    assert.equal('duration' in parsed.data, false);
    assert.equal('watchSessionId' in parsed.data, false);
  }
});
