import type { DetectedMediaCandidate, DetectionEvidence, DetectionContext, SiteDetector } from '../types.ts';
import { isMiruroHost, parseEpisodeParam, safeDecodeSlug } from '../url.ts';

export class MiruroDetector implements SiteDetector {
  readonly id = 'miruro';

  canHandle(url: URL): boolean {
    if (url.protocol !== 'https:') {
      return false;
    }

    if (!isMiruroHost(url.hostname)) {
      return false;
    }

    // Path must start with /watch/
    return url.pathname.startsWith('/watch/');
  }

  detect(context: DetectionContext): DetectedMediaCandidate | null {
    const url = context.url;

    if (!this.canHandle(url)) {
      return null;
    }

    // Match /watch/{anilistId}/{slug}
    // E.g. /watch/102976/kono-subarashii-sekai-ni-shukufuku-wo-kurenai-densetsu
    const segments = url.pathname.split('/').filter((s) => s.length > 0);
    if (segments.length < 2 || segments[0] !== 'watch') {
      return null;
    }

    const rawId = segments[1];
    if (!rawId || !/^\d+$/.test(rawId)) {
      return null;
    }

    const anilistIdNum = Number.parseInt(rawId, 10);
    if (!Number.isSafeInteger(anilistIdNum) || anilistIdNum <= 0 || anilistIdNum > 50_000_000) {
      return null;
    }

    const rawSlug = segments[2] || '';
    const slugTitleHint = safeDecodeSlug(rawSlug);

    // Parse strictly episode number from 'ep' query parameter
    const episodeNumber = parseEpisodeParam(url.searchParams);

    const evidence: DetectionEvidence[] = ['url_external_id'];
    if (slugTitleHint.length > 0) {
      evidence.push('url_slug');
    }
    if (episodeNumber !== null) {
      evidence.push('query_episode');
    }

    // Determine best title hint: use slug title hint as primary clean hint
    const titleHint = slugTitleHint || (context.heading ? context.heading : `Anime AniList #${rawId}`);

    const candidate: DetectedMediaCandidate = {
      detectorId: this.id,
      provider: 'anilist',
      externalId: String(anilistIdNum),
      titleHint,
      mediaType: null, // Left null so server metadata catalog confirms movie vs series definitively
      episodeNumber,
      seasonNumber: null,
      sourceName: 'miruro',
      sourceDomain: 'miruro.bz',
      confidence: 0.98, // Very high confidence due to explicit AniList ID in verified URL
      evidence,
      detectedAt: new Date().toISOString(),
      playbackConfirmed: context.playbackActive,
    };

    return candidate;
  }
}
