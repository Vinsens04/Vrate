import type {
  DetectedMediaCandidate,
  DetectionContext,
  SiteDetector,
} from './types.ts';
import { MiruroDetector } from './adapters/miruro.ts';
import { GenericDetector } from './adapters/generic.ts';
import { safeParseUrl } from './url.ts';
import {
  extractJsonLdMetadata,
  extractMainHeading,
  extractOpenGraphMetadata,
} from './sanitizers.ts';

export class DetectionEngine {
  private readonly detectors: SiteDetector[];

  constructor(customDetectors?: SiteDetector[]) {
    this.detectors = customDetectors || [
      new MiruroDetector(),
      new GenericDetector(),
    ];
  }

  /**
   * Evaluates context against registered detectors in priority order.
   * Special adapters execute before the generic fallback.
   */
  detect(context: DetectionContext): DetectedMediaCandidate | null {
    const url = context.url;

    for (const detector of this.detectors) {
      if (detector.canHandle(url)) {
        try {
          const candidate = detector.detect(context);
          if (candidate) {
            return this.normalizeCandidate(candidate);
          }
        } catch {
          // Logically skip detector if internal error occurs
        }
      }
    }

    return null;
  }

  /**
   * Defensively normalizes candidate fields to avoid malformed data.
   */
  private normalizeCandidate(candidate: DetectedMediaCandidate): DetectedMediaCandidate {
    const confidence = Math.min(Math.max(Number(candidate.confidence) || 0, 0), 1);
    return {
      ...candidate,
      titleHint: candidate.titleHint.trim().slice(0, 300),
      confidence,
      sourceName: candidate.sourceName.trim().slice(0, 64),
      sourceDomain: candidate.sourceDomain.trim().slice(0, 255),
      externalId: candidate.externalId ? candidate.externalId.trim().slice(0, 64) : null,
      detectedAt: candidate.detectedAt || new Date().toISOString(),
    };
  }
}

export const defaultEngine = new DetectionEngine();

/**
 * Extracts a minimal, privacy-respecting DetectionContext from a live document.
 * Strictly avoids reading innerText, user inputs, cookies, or storage.
 */
export function extractPageContext(
  doc: Document,
  locationHref: string
): DetectionContext | null {
  const url = safeParseUrl(locationHref);
  if (!url) {
    return null;
  }

  // 1. JSON-LD scripts (max 10 blocks, max 64KB per block)
  const jsonLdBlocks: unknown[] = [];
  try {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length && i < 10; i++) {
      const el = scripts[i];
      const text = el?.textContent || '';
      if (text.length > 0 && text.length <= 65536) {
        try {
          jsonLdBlocks.push(JSON.parse(text));
        } catch {
          // Ignore syntax errors
        }
      }
    }
  } catch {
    // Ignore DOM query errors
  }

  // 2. Open Graph meta tags
  const ogMeta = extractOpenGraphMetadata(doc);
  const openGraph: Record<string, string> = {};
  if (ogMeta.title) openGraph['og:title'] = ogMeta.title;
  if (ogMeta.ogType) openGraph['og:type'] = ogMeta.ogType;

  // 3. Heading & document title
  const heading = extractMainHeading(doc) || undefined;
  const documentTitle = doc.title ? doc.title.slice(0, 250) : undefined;

  // 4. Video presence
  let videoElementPresent = false;
  try {
    videoElementPresent = Boolean(doc.querySelector('video'));
  } catch {
    // Non-fatal
  }

  return {
    url,
    documentTitle,
    jsonLd: jsonLdBlocks,
    openGraph,
    heading,
    videoElementPresent,
  };
}
