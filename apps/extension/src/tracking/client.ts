/**
 * ==============================================================================
 * TRACKING CLIENT (Step 8)
 * ==============================================================================
 * Popup and content script helpers to interact with background tracking state.
 *
 * ZERO-TOKEN GUARANTEE:
 * Does not handle, request, or receive Supabase tokens.
 * ==============================================================================
 */

import type { TabTrackingSession } from './tab-tracker-state';
import type { TrackingStatus } from '@vrate/shared';

export async function getActiveTabTrackingState(): Promise<TabTrackingSession | null> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return null;
  }

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'TRACKING_GET_STATE',
      payload: {},
    });

    if (res && res.success) {
      return res.session || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function startActiveTabTracking(params: {
  libraryEntryId: string;
  mediaId: string;
  episodeNumber?: number | null;
  seasonNumber?: number | null;
  sourceName: string;
  sourceDomain: string;
  sourceUrl?: string | null;
  initialProgressSeconds?: number;
  durationSeconds?: number | null;
}): Promise<{ success: boolean; session?: TabTrackingSession | null; error?: string }> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return { success: false, error: 'Runtime ekstensi tidak tersedia.' };
  }

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'TRACKING_START',
      payload: params,
    });

    return res || { success: false, error: 'Tidak ada respons dari background.' };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memulai tracking.',
    };
  }
}

export async function stopActiveTabTracking(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return false;
  }

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'TRACKING_STOP',
      payload: {},
    });

    return Boolean(res?.success);
  } catch {
    return false;
  }
}

export async function markActiveTabEpisodeCompleted(params?: {
  libraryEntryId?: string;
  episodeNumber?: number;
  seasonNumber?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return { success: false, error: 'Runtime ekstensi tidak tersedia.' };
  }

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'TRACKING_MARK_COMPLETED',
      payload: params || {},
    });
    return res || { success: false, error: 'Tidak ada respons.' };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menandai selesai.' };
  }
}

export async function deleteActiveTabEpisodeProgress(params?: {
  libraryEntryId?: string;
  episodeNumber?: number;
  seasonNumber?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return { success: false, error: 'Runtime ekstensi tidak tersedia.' };
  }

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'TRACKING_DELETE_PROGRESS',
      payload: params || {},
    });
    return res || { success: false, error: 'Tidak ada respons.' };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menghapus progres.' };
  }
}

export async function correctActiveTabEpisode(params: {
  correctedEpisodeNumber: number;
  libraryEntryId?: string;
  currentEpisodeNumber?: number;
  seasonNumber?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return { success: false, error: 'Runtime ekstensi tidak tersedia.' };
  }

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'TRACKING_CORRECT_EPISODE',
      payload: params,
    });
    return res || { success: false, error: 'Tidak ada respons.' };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal memperbaiki episode.' };
  }
}

/**
 * Human-readable status label in Indonesian.
 */
export function formatTrackingStatus(status: TrackingStatus): {
  label: string;
  color: string;
} {
  switch (status) {
    case 'tracking':
      return { label: 'Sedang Melacak', color: '#5DBB8A' };
    case 'paused':
      return { label: 'Dijeda', color: '#E5A93C' };
    case 'syncing':
      return { label: 'Menyinkronkan...', color: '#FF5C35' };
    case 'synced':
      return { label: 'Tersinkron', color: '#5DBB8A' };
    case 'offline_queued':
      return { label: 'Tersimpan Offline', color: '#E5A93C' };
    case 'waiting_video':
      return { label: 'Menunggu Player Video', color: '#888888' };
    case 'video_detected':
      return { label: 'Video Terdeteksi', color: '#5DBB8A' };
    case 'unsupported_iframe':
      return { label: 'Player Embed (Iframe Terpisah)', color: '#E57373' };
    case 'error':
      return { label: 'Gagal Sinkronisasi', color: '#FF4D4D' };
    case 'idle':
    default:
      return { label: 'Siap Melacak', color: '#888888' };
  }
}

/**
 * Formats seconds into "MM:SS" or "HH:MM:SS".
 */
export function formatSecondsToTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const paddedSecs = secs.toString().padStart(2, '0');
  if (hrs > 0) {
    const paddedMins = mins.toString().padStart(2, '0');
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}
