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
  matchScore?: number;
}

export interface ResolveMediaResponse {
  success: boolean;
  candidates: ResolvedMediaItem[];
  exactMatch: boolean;
  cleanedTitle?: string;
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
// Video Progress Tracking & Watch Sessions Contracts (Step 8)
// ------------------------------------------------------------------------------
export const TRACKING_STATUSES = [
  'waiting_video',
  'video_detected',
  'waiting_confirmation',
  'tracking',
  'paused',
  'syncing',
  'synced',
  'offline_queued',
  'unsupported_iframe',
  'error',
  'idle',
] as const;
export const trackingStatusSchema = z.enum(TRACKING_STATUSES);
export type TrackingStatus = z.infer<typeof trackingStatusSchema>;

export const TRACKING_EVENT_TYPES = [
  'play',
  'playing',
  'pause',
  'seeking',
  'seeked',
  'ratechange',
  'timeupdate',
  'ended',
  'visibilitychange',
  'pagehide',
  'checkpoint',
  'stop',
] as const;
export const trackingEventTypeSchema = z.enum(TRACKING_EVENT_TYPES);
export type TrackingEventType = z.infer<typeof trackingEventTypeSchema>;

export const startTrackingRequestSchema = z.object({
  clientSessionId: z.string().uuid('clientSessionId must be a valid UUID'),
  libraryEntryId: z.string().uuid('libraryEntryId must be a valid UUID'),
  mediaId: z.string().uuid('mediaId must be a valid UUID').optional(),
  episodeNumber: z.number().int().positive().nullable().optional(),
  seasonNumber: z.number().int().nonnegative().nullable().optional(),
  sourceName: z.string().min(1).max(64),
  sourceDomain: z.string().min(1).max(255),
  sourceUrl: z.string().max(500).nullable().optional(),
  initialProgressSeconds: z.number().min(0).max(86400).default(0),
  durationSeconds: z.number().positive().max(86400).nullable().optional(),
});
export type StartTrackingRequest = z.infer<typeof startTrackingRequestSchema>;

export const checkpointTrackingRequestSchema = z.object({
  clientSessionId: z.string().uuid('clientSessionId must be a valid UUID'),
  libraryEntryId: z.string().uuid('libraryEntryId must be a valid UUID'),
  episodeNumber: z.number().int().positive().nullable().optional(),
  seasonNumber: z.number().int().nonnegative().nullable().optional(),
  progressSeconds: z.number().min(0).max(86400),
  durationSeconds: z.number().positive().max(86400).nullable().optional(),
  watchedDeltaSeconds: z.number().min(0).max(300),
  playbackRate: z.number().min(0.25).max(4.0).default(1.0),
  eventType: trackingEventTypeSchema.default('checkpoint'),
  isEnded: z.boolean().optional().default(false),
});
export type CheckpointTrackingRequest = z.infer<typeof checkpointTrackingRequestSchema>;

export const stopTrackingRequestSchema = z.object({
  clientSessionId: z.string().uuid('clientSessionId must be a valid UUID'),
  libraryEntryId: z.string().uuid('libraryEntryId must be a valid UUID'),
  episodeNumber: z.number().int().positive().nullable().optional(),
  seasonNumber: z.number().int().nonnegative().nullable().optional(),
  finalProgressSeconds: z.number().min(0).max(86400),
  durationSeconds: z.number().positive().max(86400).nullable().optional(),
  watchedDeltaSeconds: z.number().min(0).max(300).default(0),
  reason: z.enum(['user_stop', 'episode_change', 'ended', 'tab_closed', 'dismissed']).default('user_stop'),
});
export type StopTrackingRequest = z.infer<typeof stopTrackingRequestSchema>;

export interface TrackingOperationResponse {
  success: boolean;
  sessionId?: string;
  isCompleted?: boolean;
  progressPercent?: number;
  progressSeconds?: number;
  durationSeconds?: number | null;
  message?: string;
  error?: string;
}

export const AUTO_TRACK_CONFIRMATION_SECONDS = 30;
export const AUTO_COMPLETE_DEFAULT_THRESHOLD_PERCENT = 90;

export const markEpisodeCompletedRequestSchema = z.object({
  libraryEntryId: z.string().uuid('libraryEntryId must be a valid UUID'),
  episodeNumber: z.number().int().positive(),
  seasonNumber: z.number().int().nonnegative().nullable().optional(),
});
export type MarkEpisodeCompletedRequest = z.infer<typeof markEpisodeCompletedRequestSchema>;

export const deleteEpisodeProgressRequestSchema = z.object({
  libraryEntryId: z.string().uuid('libraryEntryId must be a valid UUID'),
  episodeNumber: z.number().int().positive(),
  seasonNumber: z.number().int().nonnegative().nullable().optional(),
});
export type DeleteEpisodeProgressRequest = z.infer<typeof deleteEpisodeProgressRequestSchema>;

export const correctEpisodeRequestSchema = z.object({
  libraryEntryId: z.string().uuid('libraryEntryId must be a valid UUID'),
  currentEpisodeNumber: z.number().int().positive(),
  correctedEpisodeNumber: z.number().int().positive(),
  seasonNumber: z.number().int().nonnegative().nullable().optional(),
});
export type CorrectEpisodeRequest = z.infer<typeof correctEpisodeRequestSchema>;

// ------------------------------------------------------------------------------
// Application Info & Helpers
// ------------------------------------------------------------------------------
export const APP_INFO = {
  name: 'Vrate',
  tagline: 'Track movies, TV series, and anime seamlessly',
  version: '0.1.0',
  stage: 'Step 8: Full Automatic Episode Tracking',
} as const;


