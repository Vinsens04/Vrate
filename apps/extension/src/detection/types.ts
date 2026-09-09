import type {
  DetectionProvider,
  DetectionEvidence,
  DetectedMediaCandidate,
  ResolveMediaRequest,
  ResolveMediaResponse,
  ResolvedMediaItem,
  AddExtensionLibraryRequest,
  AddExtensionLibraryResponse,
} from '@vrate/shared';

export type {
  DetectionProvider,
  DetectionEvidence,
  DetectedMediaCandidate,
  ResolveMediaRequest,
  ResolveMediaResponse,
  ResolvedMediaItem,
  AddExtensionLibraryRequest,
  AddExtensionLibraryResponse,
};

/**
 * Clean context extracted from a page without leaking DOM or sensitive storage.
 */
export interface DetectionContext {
  url: URL;
  documentTitle?: string;
  jsonLd?: unknown[];
  openGraph?: Record<string, string>;
  heading?: string;
  videoElementPresent?: boolean;
  playbackActive?: boolean;
}

/**
 * Contract for site-specific and fallback detectors.
 */
export interface SiteDetector {
  id: string;
  canHandle(url: URL): boolean;
  detect(context: DetectionContext): DetectedMediaCandidate | null;
}

/**
 * Detection UI state for a browser tab.
 */
export type DetectionStatus =
  | 'idle'
  | 'detecting'
  | 'detected'
  | 'unrecognized';

export interface TabDetectionState {
  tabId: number;
  url: string;
  status: DetectionStatus;
  candidate: DetectedMediaCandidate | null;
  resolvedCandidates: ResolvedMediaItem[];
  resolvedExactMatch: boolean;
  isAutoDetectEligible: boolean;
  error?: string | null;
}
