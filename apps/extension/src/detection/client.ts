import { sendExtensionMessage } from '../auth/messages';
import type {
  DetectedMediaCandidate,
  ResolveMediaResponse,
  AddExtensionLibraryResponse,
} from './types';
import { requestMiruroPermission, revokeMiruroPermission } from './messages';

export interface CurrentDetectionResult {
  success: boolean;
  tabId?: number;
  candidate: DetectedMediaCandidate | null;
  status: 'idle' | 'detecting' | 'detected' | 'unrecognized';
  isMiruroPage?: boolean;
  autoPermissionGranted?: boolean;
  autoTrackEnabled?: boolean;
  error?: string;
}

export async function getCurrentDetectionState(): Promise<CurrentDetectionResult> {
  return await sendExtensionMessage<CurrentDetectionResult>({
    type: 'DETECTION_GET_CURRENT',
  } as any);
}

export async function triggerManualDetection(): Promise<CurrentDetectionResult> {
  return await sendExtensionMessage<CurrentDetectionResult>({
    type: 'DETECTION_TRIGGER_MANUAL',
  } as any);
}

export async function resolveCandidateMedia(
  candidate: DetectedMediaCandidate
): Promise<ResolveMediaResponse> {
  return await sendExtensionMessage<ResolveMediaResponse>({
    type: 'DETECTION_RESOLVE_MEDIA',
    payload: {
      provider: candidate.provider,
      externalId: candidate.externalId,
      titleHint: candidate.titleHint,
      mediaTypeHint: candidate.mediaType,
      sourceDomain: candidate.sourceDomain,
    },
  } as any);
}

export async function addCandidateToLibrary(
  provider: 'tmdb' | 'anilist',
  externalId: string,
  initialStatus: 'watchlist' | 'watching',
  episodeHint?: number | null,
  sourceName?: string,
  sourceDomain?: string
): Promise<AddExtensionLibraryResponse> {
  return await sendExtensionMessage<AddExtensionLibraryResponse>({
    type: 'DETECTION_ADD_TO_LIBRARY',
    payload: {
      provider,
      externalId,
      initialStatus,
      episodeHint,
      sourceName,
      sourceDomain,
    },
  } as any);
}

export async function dismissCandidate(): Promise<{ success: boolean }> {
  return await sendExtensionMessage<{ success: boolean }>({
    type: 'DETECTION_DISMISS_CANDIDATE',
  } as any);
}

export async function toggleMiruroPermission(currentlyGranted: boolean): Promise<boolean> {
  if (currentlyGranted) {
    return await revokeMiruroPermission();
  } else {
    return await requestMiruroPermission();
  }
}

export async function setAutoTrackingEnabled(enabled: boolean): Promise<boolean> {
  const res = await sendExtensionMessage<{ success: boolean; enabled: boolean }>({
    type: 'DETECTION_SET_AUTO_TRACK',
    payload: { enabled },
  } as any);
  return Boolean(res?.success && res.enabled);
}

export async function checkAutoPermission(): Promise<{ granted: boolean; autoTrackEnabled: boolean }> {
  const res = await sendExtensionMessage<{ success: boolean; granted: boolean; autoTrackEnabled: boolean }>({
    type: 'DETECTION_CHECK_AUTO_PERMISSION',
  } as any);
  return {
    granted: Boolean(res?.granted),
    autoTrackEnabled: res?.autoTrackEnabled !== false,
  };
}
