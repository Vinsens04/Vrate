import { z } from 'zod';

/**
 * ==============================================================================
 * VRATE SHARED TYPES & SCHEMAS
 * ==============================================================================
 * Foundation types for Movie, Series, Anime, and Episode tracking.
 * Agnostic data layer supporting both TMDB and AniList.
 */

// ------------------------------------------------------------------------------
// Media Type
// ------------------------------------------------------------------------------
export const MEDIA_TYPES = ['movie', 'series'] as const;
export const mediaTypeSchema = z.enum(MEDIA_TYPES);
export type MediaType = z.infer<typeof mediaTypeSchema>;

// ------------------------------------------------------------------------------
// Metadata Provider
// ------------------------------------------------------------------------------
export const METADATA_PROVIDERS = ['tmdb', 'anilist'] as const;
export const metadataProviderSchema = z.enum(METADATA_PROVIDERS);
export type MetadataProvider = z.infer<typeof metadataProviderSchema>;

// ------------------------------------------------------------------------------
// Streaming Source
// ------------------------------------------------------------------------------
export const STREAMING_SOURCES = [
  'netflix',
  'miruro',
  'disney_plus',
  'prime_video',
  'youtube',
  'other',
] as const;
export const streamingSourceSchema = z.enum(STREAMING_SOURCES);
export type StreamingSource = z.infer<typeof streamingSourceSchema>;

// ------------------------------------------------------------------------------
// Library Status
// ------------------------------------------------------------------------------
export const LIBRARY_STATUSES = [
  'watchlist',
  'watching',
  'completed',
  'paused',
  'dropped',
] as const;
export const libraryStatusSchema = z.enum(LIBRARY_STATUSES);
export type LibraryStatus = z.infer<typeof libraryStatusSchema>;

// ------------------------------------------------------------------------------
// External Media Identity
// ------------------------------------------------------------------------------
export const externalMediaIdentitySchema = z.object({
  provider: metadataProviderSchema,
  externalId: z.string().min(1, 'External ID must not be empty'),
});

export interface ExternalMediaIdentity {
  provider: MetadataProvider;
  externalId: string;
}

// ------------------------------------------------------------------------------
// User Profile & Settings Contracts (Step 6)
// ------------------------------------------------------------------------------
export interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface UserSettings {
  autoDetect: boolean;
  confirmBeforeTracking: boolean;
  autoTrackProgress: boolean;
  autoCompleteThreshold: number;
  autoAddAfterSeconds?: number;
  theme?: string;
}

export type ExtensionAuthState =
  | 'unconfigured'
  | 'signed_out'
  | 'loading'
  | 'signed_in'
  | 'expired'
  | 'offline'
  | 'error';

export interface ExtensionSafeUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ExtensionAuthInfo {
  state: ExtensionAuthState;
  user: ExtensionSafeUser | null;
  profile?: UserProfile | null;
  settings?: UserSettings | null;
  error?: string | null;
}

// ------------------------------------------------------------------------------
// Media Detection Models (Step 7)
// ------------------------------------------------------------------------------
export const DETECTION_PROVIDERS = ['tmdb', 'anilist', 'unknown'] as const;
export const detectionProviderSchema = z.enum(DETECTION_PROVIDERS);
export type DetectionProvider = z.infer<typeof detectionProviderSchema>;

export const DETECTION_EVIDENCE = [
  'url_external_id',
  'url_slug',
  'query_episode',
  'json_ld',
  'open_graph',
  'document_title',
  'heading',
  'video_metadata',
] as const;
export const detectionEvidenceSchema = z.enum(DETECTION_EVIDENCE);
export type DetectionEvidence = z.infer<typeof detectionEvidenceSchema>;

export const detectedMediaCandidateSchema = z.object({
  detectorId: z.string().min(1).max(64),
  provider: detectionProviderSchema,
  externalId: z.string().max(64).nullable(),
  titleHint: z.string().min(1).max(300),
  mediaType: mediaTypeSchema.nullable(),
  episodeNumber: z.number().int().positive().nullable(),
  seasonNumber: z.number().int().positive().nullable(),
  sourceName: z.string().min(1).max(64),
  sourceDomain: z.string().min(1).max(255),
  confidence: z.number().min(0).max(1),
  evidence: z.array(detectionEvidenceSchema),
  detectedAt: z.string().max(100),
  playbackConfirmed: z.boolean().optional(),
});
export type DetectedMediaCandidate = z.infer<typeof detectedMediaCandidateSchema>;

// ------------------------------------------------------------------------------
// Extension Media Resolution & Library Contracts (Step 7)
// ------------------------------------------------------------------------------
export const resolveMediaRequestSchema = z.object({
  provider: detectionProviderSchema.optional().default('unknown'),
  externalId: z.string().max(64).nullable().optional(),
  titleHint: z.string().max(300).optional(),
  mediaTypeHint: mediaTypeSchema.nullable().optional(),
  sourceDomain: z.string().max(255).optional(),
});
export type ResolveMediaRequest = z.infer<typeof resolveMediaRequestSchema>;

export interface ResolvedMediaItem {
  provider: MetadataProvider;
  externalId: string;
  mediaType: MediaType;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseYear: number | null;
  totalEpisodes: number | null;
  inLibrary: boolean;
  libraryEntryId?: string | null;
  libraryStatus?: LibraryStatus | null;
}

export interface ResolveMediaResponse {
  success: boolean;
  candidates: ResolvedMediaItem[];
  exactMatch: boolean;
  error?: string;
  message?: string;
}

export const addExtensionLibraryRequestSchema = z.object({
  provider: metadataProviderSchema,
  externalId: z.string().min(1).max(64),
  initialStatus: z.enum(['watchlist', 'watching']),
  episodeHint: z.number().int().positive().nullable().optional(),
  sourceName: z.string().max(64).optional(),
  sourceDomain: z.string().max(255).optional(),
});
export type AddExtensionLibraryRequest = z.infer<typeof addExtensionLibraryRequestSchema>;

export interface AddExtensionLibraryResponse {
  success: boolean;
  alreadyExists?: boolean;
  entryId?: string;
  mediaId?: string;
  message: string;
  error?: string;
}

// ------------------------------------------------------------------------------
// Application Info & Helpers
// ------------------------------------------------------------------------------
export const APP_INFO = {
  name: 'Vrate',
  tagline: 'Track movies, TV series, and anime seamlessly',
  version: '0.1.0',
  stage: 'Step 7: Media Detection, Miruro Adapter, & Library Confirmation',
} as const;


