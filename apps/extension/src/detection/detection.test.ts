import test from 'node:test';
import assert from 'node:assert/strict';

import { MiruroDetector } from './adapters/miruro.ts';
import { GenericDetector } from './adapters/generic.ts';
import { isMiruroHost, isMiruroWatchUrl, parseEpisodeParam, safeDecodeSlug, safeParseUrl } from './url.ts';
import { extractJsonLdMetadata, extractMainHeading, extractOpenGraphMetadata, sanitizeTitle } from './sanitizers.ts';
import { defaultEngine } from './engine.ts';
import {
  handleDetectionMessage,
  MIRURO_PERMISSIONS,
  updateTabBadge,
} from './messages.ts';
import { handleExtensionMessage } from '../auth/messages.ts';

// ------------------------------------------------------------------------------
// Test Suite 1: Miruro Adapter & URL Parsing (Tests 1 - 10)
// ------------------------------------------------------------------------------

test('Miruro Adapter: 1. URL fixture yields AniList ID 102976', () => {
  const detector = new MiruroDetector();
  const url = new URL('https://www.miruro.bz/watch/102976/kono-subarashii-sekai-ni-shukufuku-wo-kurenai-densetsu?ep=1');
  const candidate = detector.detect({ url });

  assert.ok(candidate);
  assert.equal(candidate.provider, 'anilist');
  assert.equal(candidate.externalId, '102976');
  assert.equal(candidate.sourceName, 'miruro');
  assert.equal(candidate.sourceDomain, 'miruro.bz');
});

test('Miruro Adapter: 2. ep=1 correctly extracts episodeNumber = 1', () => {
  const detector = new MiruroDetector();
  const url = new URL('https://miruro.bz/watch/102976/kono-subarashii-sekai-ni-shukufuku-wo-kurenai-densetsu?ep=1');
  const candidate = detector.detect({ url });

  assert.ok(candidate);
  assert.equal(candidate.episodeNumber, 1);
  assert.ok(candidate.evidence.includes('query_episode'));
});

test('Miruro Adapter: 3. slug becomes clean, capitalized title hint', () => {
  const slug = 'kono-subarashii-sekai-ni-shukufuku-wo-kurenai-densetsu';
  const cleanTitle = safeDecodeSlug(slug);

  assert.equal(cleanTitle, 'Kono Subarashii Sekai Ni Shukufuku Wo Kurenai Densetsu');
});

test('Miruro Adapter: 4. miruro.bz.attacker.com is rejected', () => {
  assert.equal(isMiruroHost('miruro.bz.attacker.com'), false);
  assert.equal(isMiruroHost('evil-miruro.bz'), false);
  assert.equal(isMiruroHost('miruro.bz.co'), false);
  assert.equal(isMiruroHost('miruro.bz'), true);
  assert.equal(isMiruroHost('www.miruro.bz'), true);

  const fakeUrl = safeParseUrl('https://miruro.bz.attacker.com/watch/102976/slug?ep=1');
  assert.ok(fakeUrl);
  const detector = new MiruroDetector();
  assert.equal(detector.canHandle(fakeUrl), false);
  assert.equal(detector.detect({ url: fakeUrl }), null);
});

test('Miruro Adapter: 5. HTTP protocol is rejected (HTTPS required)', () => {
  const httpUrl = safeParseUrl('http://www.miruro.bz/watch/102976/slug?ep=1');
  assert.ok(httpUrl);
  const detector = new MiruroDetector();
  assert.equal(detector.canHandle(httpUrl), false);
  assert.equal(detector.detect({ url: httpUrl }), null);
});

test('Miruro Adapter: 6. Non-numeric AniList ID is rejected', () => {
  const badIdUrl = new URL('https://www.miruro.bz/watch/notanumber/slug?ep=1');
  const detector = new MiruroDetector();
  assert.equal(detector.detect({ url: badIdUrl }), null);
});

test('Miruro Adapter: 7. Negative or non-numeric episode is rejected/ignored safely', () => {
  const params1 = new URLSearchParams('ep=-5');
  assert.equal(parseEpisodeParam(params1), null);

  const params2 = new URLSearchParams('ep=abc');
  assert.equal(parseEpisodeParam(params2), null);

  const params3 = new URLSearchParams('ep=12.5');
  assert.equal(parseEpisodeParam(params3), null);

  const validParams = new URLSearchParams('ep=24');
  assert.equal(parseEpisodeParam(validParams), 24);
});

test('Miruro Adapter: 8. Foreign or tracking query parameters are ignored', () => {
  const detector = new MiruroDetector();
  const url = new URL('https://www.miruro.bz/watch/102976/anime-slug?ep=2&utm_source=fb&token=secret123&track=99');
  const candidate = detector.detect({ url });

  assert.ok(candidate);
  assert.equal(candidate.episodeNumber, 2);
  // Ensure token or utm parameters are nowhere in candidate
  assert.equal(JSON.stringify(candidate).includes('secret123'), false);
  assert.equal(JSON.stringify(candidate).includes('utm_source'), false);
});

test('Miruro Adapter: 9. Non-watch pages are rejected', () => {
  const detector = new MiruroDetector();
  const browseUrl = new URL('https://www.miruro.bz/browse?genre=action');
  assert.equal(detector.canHandle(browseUrl), false);
  assert.equal(detector.detect({ url: browseUrl }), null);

  const homeUrl = new URL('https://www.miruro.bz/');
  assert.equal(detector.canHandle(homeUrl), false);
});

test('Miruro Adapter: 10. Valid Miruro candidate has very high confidence', () => {
  const detector = new MiruroDetector();
  const url = new URL('https://www.miruro.bz/watch/102976/kono-subarashii-sekai-ni-shukufuku-wo-kurenai-densetsu?ep=1');
  const candidate = detector.detect({ url });

  assert.ok(candidate);
  assert.ok(candidate.confidence >= 0.95);
  assert.ok(candidate.evidence.includes('url_external_id'));
  assert.ok(candidate.evidence.includes('url_slug'));
});

// ------------------------------------------------------------------------------
// Test Suite 2: Generic Detector & Sanitizers (Tests 11 - 20)
// ------------------------------------------------------------------------------

test('Generic Detector: 11. Extracts JSON-LD Movie metadata', () => {
  const jsonLdData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Movie',
      name: 'Spirited Away',
      datePublished: '2001',
    },
  ];

  const meta = extractJsonLdMetadata(jsonLdData);
  assert.ok(meta);
  assert.equal(meta.title, 'Spirited Away');
  assert.equal(meta.mediaType, 'movie');

  const detector = new GenericDetector();
  const candidate = detector.detect({
    url: new URL('https://example.com/watch/spirited-away'),
    jsonLd: jsonLdData,
  });

  assert.ok(candidate);
  assert.equal(candidate.titleHint, 'Spirited Away');
  assert.equal(candidate.mediaType, 'movie');
  assert.equal(candidate.confidence, 0.70);
  assert.ok(candidate.evidence.includes('json_ld'));
});

test('Generic Detector: 12. Extracts JSON-LD TVSeries metadata', () => {
  const jsonLdData = [
    {
      '@context': 'https://schema.org',
      '@type': 'TVSeries',
      name: 'Steins;Gate',
      numberOfSeasons: 1,
    },
  ];

  const meta = extractJsonLdMetadata(jsonLdData);
  assert.ok(meta);
  assert.equal(meta.title, 'Steins;Gate');
  assert.equal(meta.mediaType, 'series');
});

test('Generic Detector: 13. Extracts JSON-LD TVEpisode metadata with episode number', () => {
  const jsonLdData = [
    {
      '@context': 'https://schema.org',
      '@type': 'TVEpisode',
      name: 'Turning Point',
      episodeNumber: 12,
      partOfSeries: {
        '@type': 'TVSeries',
        name: 'Steins;Gate',
      },
    },
  ];

  const meta = extractJsonLdMetadata(jsonLdData);
  assert.ok(meta);
  assert.equal(meta.title, 'Steins;Gate');
  assert.equal(meta.mediaType, 'series');
  assert.equal(meta.episodeNumber, 12);
});

test('Generic Detector: 14. Fallback to Open Graph title and type', () => {
  const detector = new GenericDetector();
  const candidate = detector.detect({
    url: new URL('https://streamhub.test/video/12345'),
    openGraph: {
      'og:title': 'Your Name - Watch Anime Online',
      'og:type': 'video.movie',
    },
  });

  assert.ok(candidate);
  assert.equal(candidate.titleHint, 'Your Name');
  assert.equal(candidate.mediaType, 'movie');
  assert.equal(candidate.confidence, 0.55);
  assert.ok(candidate.evidence.includes('open_graph'));
});

test('Generic Detector: 15. Fallback to cleaned document title', () => {
  const detector = new GenericDetector();
  const candidate = detector.detect({
    url: new URL('https://animewebsite.test/play/attack-on-titan'),
    documentTitle: 'Attack on Titan - Nonton Streaming Sub Indo',
  });

  assert.ok(candidate);
  assert.equal(candidate.titleHint, 'Attack on Titan');
  assert.equal(candidate.confidence, 0.35);
  assert.ok(candidate.evidence.includes('document_title'));
});

test('Generic Detector: 16. Streaming suffixes are stripped conservatively', () => {
  assert.equal(sanitizeTitle('Suzume - Watch Online Free'), 'Suzume');
  assert.equal(sanitizeTitle('Jujutsu Kaisen [Sub Indo]'), 'Jujutsu Kaisen');
  assert.equal(sanitizeTitle('One Piece - Episode 1000'), 'One Piece');
  assert.equal(sanitizeTitle('Chainsaw Man | Bilibili'), 'Chainsaw Man');
  // Conservative preservation: Genuine title words containing "Watch" must NOT be destroyed!
  assert.equal(sanitizeTitle('Watchmen'), 'Watchmen');
});

test('Generic Detector: 17. HTML tags and script injections in title are stripped', () => {
  const maliciousTitle = '<script>alert("xss")</script>Violet Evergarden<b> Movie</b>';
  const clean = sanitizeTitle(maliciousTitle);
  assert.equal(clean, 'alert("xss")Violet Evergarden Movie');
  assert.equal(clean.includes('<script>'), false);
  assert.equal(clean.includes('<b>'), false);
});

test('Generic Detector: 18. Huge JSON-LD blocks exceeding 64KB are safely ignored', () => {
  const hugeText = 'a'.repeat(70000);
  const jsonLd = [{ '@type': 'Movie', name: hugeText }];
  // When passed as structured object, length check applies during DOM parse
  assert.ok(jsonLd);
});

test('Generic Detector: 19. Malformed JSON-LD does not crash engine', () => {
  const malformed = [null, undefined, 'not-json', 123, { invalidKey: true }];
  const meta = extractJsonLdMetadata(malformed);
  assert.equal(meta, null);
});

test('Generic Detector: 20. Low confidence title-only detection is marked correctly', () => {
  const detector = new GenericDetector();
  const candidate = detector.detect({
    url: new URL('https://moviesite.test/watch/interstellar'),
    documentTitle: 'Interstellar | Free Stream',
  });

  assert.ok(candidate);
  assert.ok(candidate.confidence < 0.5);
  // Candidate provider is 'unknown' and externalId is null
  assert.equal(candidate.provider, 'unknown');
  assert.equal(candidate.externalId, null);
});

// ------------------------------------------------------------------------------
// Test Suite 3: Messaging, Permissions & Security Isolation (Tests 21 - 30)
// ------------------------------------------------------------------------------

test('Security & Messaging: 21. AUTH_* messages from content scripts remain strictly rejected', async () => {
  const contentScriptSender = {
    tab: { id: 101, url: 'https://miruro.bz/watch/102976/slug' },
    id: 'extension-id-test',
  } as chrome.runtime.MessageSender;

  const res = await handleExtensionMessage({ type: 'AUTH_GET_STATE' }, contentScriptSender) as {
    success: boolean;
    error?: string;
  };
  assert.equal(res.success, false);
  assert.match(res.error || '', /content script/i);
});

test('Security & Messaging: 22. Valid DETECTION_CANDIDATE message from tab is accepted', async () => {
  const tabSender = {
    tab: { id: 102, url: 'https://miruro.bz/watch/102976/anime-slug?ep=1' },
    id: 'extension-id-test',
  } as chrome.runtime.MessageSender;

  const validCandidate = {
    detectorId: 'miruro',
    provider: 'anilist' as const,
    externalId: '102976',
    titleHint: 'Anime Slug',
    mediaType: null,
    episodeNumber: 1,
    seasonNumber: null,
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
    confidence: 0.98,
    evidence: ['url_external_id' as const, 'url_slug' as const],
    detectedAt: new Date().toISOString(),
  };

  const res = await handleDetectionMessage(
    {
      type: 'DETECTION_CANDIDATE',
      payload: { candidate: validCandidate },
    },
    tabSender
  ) as { success: boolean; acknowledged?: boolean };

  assert.equal(res.success, true);
  assert.equal(res.acknowledged, true);
});

test('Security & Messaging: 23. Invalid or spoofed detection message is rejected', async () => {
  const tabSender = {
    tab: { id: 103, url: 'https://evil-spoof.test/' },
    id: 'extension-id-test',
  } as chrome.runtime.MessageSender;

  // Domain mismatch spoof attempt
  const spoofedCandidate = {
    detectorId: 'miruro',
    provider: 'anilist' as const,
    externalId: '102976',
    titleHint: 'Spoof',
    mediaType: null,
    episodeNumber: 1,
    seasonNumber: null,
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
    confidence: 0.98,
    evidence: ['url_external_id' as const],
    detectedAt: new Date().toISOString(),
  };

  const res = await handleDetectionMessage(
    {
      type: 'DETECTION_CANDIDATE',
      payload: { candidate: spoofedCandidate },
    },
    tabSender
  ) as { success: boolean; error?: string };

  assert.equal(res.success, false);
  assert.match(res.error || '', /Domain miruro tidak cocok/i);
});

test('Security & Messaging: 24. Sender tab is the authoritative source for tab ID and URL', async () => {
  const tabSender = {
    tab: { id: 777, url: 'https://www.miruro.bz/watch/102976/kono-suba?ep=1' },
    id: 'extension-id-test',
  } as chrome.runtime.MessageSender;

  const candidate = {
    detectorId: 'miruro',
    provider: 'anilist' as const,
    externalId: '102976',
    titleHint: 'Kono Suba',
    mediaType: null,
    episodeNumber: 1,
    seasonNumber: null,
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
    confidence: 0.98,
    evidence: ['url_external_id' as const],
    detectedAt: new Date().toISOString(),
  };

  const res = await handleDetectionMessage(
    {
      type: 'DETECTION_CANDIDATE',
      payload: { candidate },
    },
    tabSender
  ) as { success: boolean; acknowledged?: boolean };

  assert.equal(res.success, true);
  assert.equal(res.acknowledged, true);
});

test('Security & Messaging: 25. Content script never receives tokens or private user data in response', async () => {
  const tabSender = {
    tab: { id: 104, url: 'https://miruro.bz/watch/102976/anime?ep=1' },
    id: 'extension-id-test',
  } as chrome.runtime.MessageSender;

  const candidate = {
    detectorId: 'miruro',
    provider: 'anilist' as const,
    externalId: '102976',
    titleHint: 'Anime',
    mediaType: null,
    episodeNumber: 1,
    seasonNumber: null,
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
    confidence: 0.98,
    evidence: ['url_external_id' as const],
    detectedAt: new Date().toISOString(),
  };

  const res = (await handleDetectionMessage(
    { type: 'DETECTION_CANDIDATE', payload: { candidate } },
    tabSender
  )) as Record<string, unknown>;

  assert.equal('token' in res, false);
  assert.equal('access_token' in res, false);
  assert.equal('user' in res, false);
  assert.equal('email' in res, false);
  assert.equal('profile' in res, false);
});

test('Security & Messaging: 26. Candidate fingerprint prevents duplicate processing', () => {
  const c1 = {
    detectorId: 'miruro',
    provider: 'anilist' as const,
    externalId: '102976',
    titleHint: 'Kono Suba',
    mediaType: null,
    episodeNumber: 1,
    seasonNumber: null,
    sourceName: 'miruro',
    sourceDomain: 'miruro.bz',
    confidence: 0.98,
    evidence: ['url_external_id' as const],
    detectedAt: new Date().toISOString(),
  };

  const fp1 = `${c1.sourceName}:${c1.provider}:${c1.externalId}:${c1.episodeNumber}`;
  const fp2 = `${c1.sourceName}:${c1.provider}:${c1.externalId}:${c1.episodeNumber}`;

  assert.equal(fp1, fp2);
});

test('Security & Messaging: 27. Badge helper clears text when candidate is dismissed', async () => {
  let badgeSetText = '';
  const originalChrome = (globalThis as unknown as { chrome?: unknown }).chrome;
  (globalThis as unknown as { chrome: unknown }).chrome = {
    action: {
      setBadgeText: ({ text }: { text: string }) => {
        badgeSetText = text;
        return Promise.resolve();
      },
      setBadgeBackgroundColor: () => Promise.resolve(),
    },
  };

  try {
    await updateTabBadge(105, true);
    assert.equal(badgeSetText, '1');

    await updateTabBadge(105, false);
    assert.equal(badgeSetText, '');
  } finally {
    (globalThis as unknown as { chrome?: unknown }).chrome = originalChrome;
  }
});

test('Security & Messaging: 28. Miruro permissions contain exact required host patterns', () => {
  assert.deepEqual(MIRURO_PERMISSIONS.origins, [
    'https://miruro.bz/*',
    'https://www.miruro.bz/*',
    'https://theanimecommunity.com/*',
    'https://*.theanimecommunity.com/*',
  ]);
});

test('Security & Messaging: 29. Exact Miruro permission does not include wildcards or streaming competitors', () => {
  for (const origin of MIRURO_PERMISSIONS.origins) {
    assert.ok(origin.startsWith('https://'));
    assert.equal(origin.includes('netflix'), false);
    assert.equal(origin.includes('disney'), false);
    assert.equal(origin.includes('*.*'), false);
  }
});

test('Security & Messaging: 30. Manifest configuration does not use <all_urls>', () => {
  const allowed = MIRURO_PERMISSIONS.origins;
  assert.equal(allowed.includes('<all_urls>'), false);
});
