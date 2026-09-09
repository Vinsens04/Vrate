import { z } from 'zod';

export const detectionProviderSchema = z.enum(['tmdb', 'anilist', 'unknown']);
export type DetectionProvider = z.infer<typeof detectionProviderSchema>;

export const detectionEvidenceSchema = z.enum([
  'url_external_id',
  'url_slug',
  'query_episode',
  'json_ld',
  'open_graph',
  'document_title',
  'heading',
  'video_metadata',
]);
export type DetectionEvidence = z.infer<typeof detectionEvidenceSchema>;

export const detectedMediaCandidateSchema = z.object({
  detectorId: z.string().min(1).max(64),
  provider: detectionProviderSchema,
  externalId: z.string().max(64).nullable(),
  titleHint: z.string().min(1).max(300),
  mediaType: z.enum(['movie', 'series']).nullable(),
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

export const resolveMediaRequestSchema = z.object({
  provider: detectionProviderSchema.optional().default('unknown'),
  externalId: z.string().max(64).nullable().optional(),
  titleHint: z.string().max(300).optional(),
  mediaTypeHint: z.enum(['movie', 'series']).nullable().optional(),
  sourceDomain: z.string().max(255).optional(),
});
export type ResolveMediaRequest = z.infer<typeof resolveMediaRequestSchema>;

export const addExtensionLibraryRequestSchema = z.object({
  provider: z.enum(['tmdb', 'anilist']),
  externalId: z.string().min(1).max(64),
  initialStatus: z.enum(['watchlist', 'watching']),
  episodeHint: z.number().int().positive().nullable().optional(),
  sourceName: z.string().max(64).optional(),
  sourceDomain: z.string().max(255).optional(),
});
export type AddExtensionLibraryRequest = z.infer<typeof addExtensionLibraryRequestSchema>;

/**
 * Message from Content Script when a candidate media is discovered.
 * Must only be accepted if sender.tab is present.
 */
export const detectionCandidateFoundMessageSchema = z.object({
  type: z.literal('DETECTION_CANDIDATE'),
  payload: z.object({
    candidate: detectedMediaCandidateSchema,
  }),
});

/**
 * Message from Popup to query current detection state for active tab.
 */
export const detectionGetCurrentMessageSchema = z.object({
  type: z.literal('DETECTION_GET_CURRENT'),
  payload: z
    .object({
      tabId: z.number().int().positive().optional(),
    })
    .optional(),
});

/**
 * Message from Popup to trigger activeTab manual injection.
 */
export const detectionTriggerManualMessageSchema = z.object({
  type: z.literal('DETECTION_TRIGGER_MANUAL'),
  payload: z
    .object({
      tabId: z.number().int().positive().optional(),
    })
    .optional(),
});

/**
 * Message from Popup to resolve candidate against Vrate catalog via backend API.
 */
export const detectionResolveMediaMessageSchema = z.object({
  type: z.literal('DETECTION_RESOLVE_MEDIA'),
  payload: resolveMediaRequestSchema,
});

/**
 * Message from Popup to add media to library via backend API.
 */
export const detectionAddToLibraryMessageSchema = z.object({
  type: z.literal('DETECTION_ADD_TO_LIBRARY'),
  payload: addExtensionLibraryRequestSchema,
});

/**
 * Message from Popup to check optional Miruro host permission.
 */
export const detectionCheckAutoPermissionMessageSchema = z.object({
  type: z.literal('DETECTION_CHECK_AUTO_PERMISSION'),
});

/**
 * Message from Popup to dismiss the candidate on current tab.
 */
export const detectionDismissCandidateMessageSchema = z.object({
  type: z.literal('DETECTION_DISMISS_CANDIDATE'),
  payload: z
    .object({
      tabId: z.number().int().positive().optional(),
    })
    .optional(),
});

/**
 * Message from Popup to set auto-track preference.
 */
export const detectionSetAutoTrackMessageSchema = z.object({
  type: z.literal('DETECTION_SET_AUTO_TRACK'),
  payload: z.object({
    enabled: z.boolean(),
  }),
});

/**
 * Union of all detection messages processed by background router.
 */
export const detectionMessageSchema = z.union([
  detectionCandidateFoundMessageSchema,
  detectionGetCurrentMessageSchema,
  detectionTriggerManualMessageSchema,
  detectionResolveMediaMessageSchema,
  detectionAddToLibraryMessageSchema,
  detectionCheckAutoPermissionMessageSchema,
  detectionDismissCandidateMessageSchema,
  detectionSetAutoTrackMessageSchema,
]);

export type DetectionMessage = z.infer<typeof detectionMessageSchema>;
