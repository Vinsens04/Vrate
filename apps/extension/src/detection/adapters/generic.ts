import type {
  DetectedMediaCandidate,
  DetectionContext,
  DetectionEvidence,
  SiteDetector,
} from '../types.ts';
import {
  cleanMediaTitle,
  extractEpisodeAndSeason,
  extractJsonLdMetadata,
  sanitizeTitle,
} from '../sanitizers.ts';
import { safeDecodeSlug } from '../url.ts';

export class GenericDetector implements SiteDetector {
  readonly id = 'generic';

  canHandle(url: URL): boolean {
    // Permitted for any http/https URL except browser internal pages
    return url.protocol === 'http:' || url.protocol === 'https:';
  }

  detect(context: DetectionContext): DetectedMediaCandidate | null {
    const url = context.url;
    if (!this.canHandle(url)) {
      return null;
    }

    let titleHint: string | null = null;
    let mediaType: 'movie' | 'series' | null = null;
    let episodeNumber: number | null = null;
    let seasonNumber: number | null = null;
    let confidence = 0.2;
    const evidence: DetectionEvidence[] = [];

    // 1. JSON-LD Evaluation
    if (context.jsonLd && Array.isArray(context.jsonLd) && context.jsonLd.length > 0) {
      const jsonLdMeta = extractJsonLdMetadata(context.jsonLd);
      if (jsonLdMeta && jsonLdMeta.title) {
        titleHint = jsonLdMeta.title;
        mediaType = jsonLdMeta.mediaType || null;
        episodeNumber = jsonLdMeta.episodeNumber || null;
        seasonNumber = jsonLdMeta.seasonNumber || null;
        confidence = 0.70;
        evidence.push('json_ld');
      }
    }

    // 2. Open Graph Evaluation (if titleHint not yet obtained)
    if (!titleHint && context.openGraph?.['og:title']) {
      const ogTitle = sanitizeTitle(context.openGraph['og:title']);
      if (ogTitle.length >= 2) {
        titleHint = ogTitle;
        const ogType = context.openGraph['og:type']?.toLowerCase();
        if (ogType?.includes('movie')) {
          mediaType = 'movie';
        } else if (ogType?.includes('tv_show') || ogType?.includes('episode') || ogType?.includes('series')) {
          mediaType = 'series';
        }
        confidence = 0.55;
        evidence.push('open_graph');
      }
    }

    // 3. Safe Video Element Metadata (if video present and context provides title)
    if (context.videoElementPresent) {
      evidence.push('video_metadata');
    }

    // 4. Main Heading (h1) Evaluation
    if (!titleHint && context.heading) {
      const headingClean = sanitizeTitle(context.heading);
      if (headingClean.length >= 2) {
        titleHint = headingClean;
        confidence = 0.40;
        evidence.push('heading');
      }
    }

    // 5. Document Title Evaluation
    if (!titleHint && context.documentTitle) {
      const docClean = sanitizeTitle(context.documentTitle);
      if (docClean.length >= 2) {
        titleHint = docClean;
        confidence = 0.35;
        evidence.push('document_title');
      }
    }

    // 6. URL Slug Fallback
    if (!titleHint) {
      const pathSegments = url.pathname.split('/').filter((s) => s.length > 0);
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment && !lastSegment.includes('.')) {
        const slugTitle = safeDecodeSlug(lastSegment);
        if (slugTitle.length >= 3) {
          titleHint = slugTitle;
          confidence = 0.20;
          evidence.push('url_slug');
        }
      }
    }

    if (!titleHint || titleHint.length < 2) {
      return null;
    }

    // Extract episode & season info from full context if not provided by JSON-LD
    if (episodeNumber === null || seasonNumber === null) {
      const extracted = extractEpisodeAndSeason(
        context.documentTitle || context.heading || context.openGraph?.['og:title'] || url.pathname
      );
      if (episodeNumber === null && extracted.episode) {
        episodeNumber = extracted.episode;
      }
      if (seasonNumber === null && extracted.season) {
        seasonNumber = extracted.season;
      }
    }

    // Clean title for higher catalog resolution hit rate
    const cleanedTitleHint = cleanMediaTitle(titleHint);
    if (cleanedTitleHint && cleanedTitleHint.length >= 2) {
      titleHint = cleanedTitleHint;
    }

    // Determine clean domain
    const sourceDomain = url.hostname.replace(/^www\./, '');

    return {
      detectorId: this.id,
      provider: 'unknown',
      externalId: null,
      titleHint: titleHint.slice(0, 250),
      mediaType,
      episodeNumber,
      seasonNumber,
      sourceName: sourceDomain,
      sourceDomain,
      confidence: Math.min(Math.max(confidence, 0), 1),
      evidence,
      detectedAt: new Date().toISOString(),
      playbackConfirmed: context.playbackActive,
    };
  }
}
