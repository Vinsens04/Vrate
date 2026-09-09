/**
 * ==============================================================================
 * TRACKING RUNTIME MESSAGE HANDLER (Step 8)
 * ==============================================================================
 * Routes tracking messages between Background, Content Scripts, and Popup.
 * ==============================================================================
 */

import {
  getTabTrackingSession,
  startTrackingSession,
  stopTrackingSession,
  handleCheckpointFromTab,
  updateTabTrackingStatus,
  updateTabTrackingPosition,
  markTabEpisodeCompleted,
  deleteTabEpisodeProgress,
  correctTabEpisode,
  type TabTrackingSession,
} from './tab-tracker-state.ts';
import type { TrackingStatus, TrackingEventType } from '@vrate/shared';

export interface TrackingMessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  session?: TabTrackingSession | null;
  error?: string;
}

export async function handleTrackingMessage(
  message: Record<string, unknown>,
  sender: chrome.runtime.MessageSender
): Promise<TrackingMessageResponse> {
  const type = String(message.type || '');
  const payload = (message.payload || {}) as Record<string, unknown>;

  // 1. Content Script: Checkpoint report
  if (type === 'TRACKING_CHECKPOINT') {
    const tabId = sender.tab?.id;
    if (!tabId) {
      return { success: false, error: 'Tidak dapat menentukan tabId pengirim.' };
    }

    await handleCheckpointFromTab(tabId, {
      progressSeconds: Number(payload.progressSeconds || 0),
      durationSeconds:
        payload.durationSeconds !== null && payload.durationSeconds !== undefined
          ? Number(payload.durationSeconds)
          : null,
      watchedDeltaSeconds: Number(payload.watchedDeltaSeconds || 0),
      playbackRate: Number(payload.playbackRate || 1.0),
      eventType: (payload.eventType as TrackingEventType) || 'checkpoint',
      isEnded: Boolean(payload.isEnded),
      generation: payload.generation !== undefined ? Number(payload.generation) : undefined,
    });

    return { success: true };
  }

  // 2. Content Script: Live in-memory position tick (0 server requests)
  if (type === 'TRACKING_POSITION_UPDATE') {
    const tabId = sender.tab?.id;
    if (tabId) {
      updateTabTrackingPosition(
        tabId,
        Number(payload.progressSeconds || 0),
        payload.durationSeconds !== null && payload.durationSeconds !== undefined
          ? Number(payload.durationSeconds)
          : null,
        payload.generation !== undefined ? Number(payload.generation) : undefined
      );
    }
    return { success: true };
  }

  // 3. Content Script: Status update
  if (type === 'TRACKING_STATUS_UPDATE') {
    const tabId = sender.tab?.id;
    if (!tabId) {
      return { success: false, error: 'Tidak dapat menentukan tabId pengirim.' };
    }

    updateTabTrackingStatus(
      tabId,
      payload.status as TrackingStatus,
      payload.details as { iframeDomain?: string; error?: string },
      payload.generation !== undefined ? Number(payload.generation) : undefined
    );
    return { success: true };
  }

  // 4. Popup: Get tracking state for current active tab
  if (type === 'TRACKING_GET_STATE') {
    let tabId = Number(payload.tabId);
    if (!tabId || isNaN(tabId)) {
      // Find active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id || 0;
    }

    if (!tabId) {
      return { success: false, session: null, error: 'Tab tidak ditemukan.' };
    }

    const session = getTabTrackingSession(tabId);
    return { success: true, session };
  }

  // 5. Popup: Start tracking
  if (type === 'TRACKING_START') {
    let tabId = Number(payload.tabId);
    if (!tabId || isNaN(tabId)) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id || 0;
    }

    if (!tabId) {
      return { success: false, error: 'Tab aktif tidak ditemukan.' };
    }

    const result = await startTrackingSession(tabId, {
      libraryEntryId: String(payload.libraryEntryId),
      mediaId: String(payload.mediaId),
      episodeNumber:
        payload.episodeNumber !== null && payload.episodeNumber !== undefined
          ? Number(payload.episodeNumber)
          : null,
      seasonNumber:
        payload.seasonNumber !== null && payload.seasonNumber !== undefined
          ? Number(payload.seasonNumber)
          : null,
      sourceName: String(payload.sourceName || 'web'),
      sourceDomain: String(payload.sourceDomain || 'unknown'),
      sourceUrl: payload.sourceUrl ? String(payload.sourceUrl) : null,
      initialProgressSeconds: payload.initialProgressSeconds
        ? Number(payload.initialProgressSeconds)
        : 0,
      durationSeconds: payload.durationSeconds ? Number(payload.durationSeconds) : null,
    });

    const session = getTabTrackingSession(tabId);
    return { success: result.success, session, error: result.error };
  }

  // 6. Popup: Stop tracking
  if (type === 'TRACKING_STOP') {
    let tabId = Number(payload.tabId);
    if (!tabId || isNaN(tabId)) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id || 0;
    }

    if (tabId) {
      await stopTrackingSession(tabId, 'user_stop');
    }

    return { success: true };
  }

  // 7. Popup: Mark episode completed
  if (type === 'TRACKING_MARK_COMPLETED') {
    let tabId = Number(payload.tabId);
    if (!tabId || isNaN(tabId)) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id || 0;
    }

    const result = await markTabEpisodeCompleted(tabId, {
      libraryEntryId: payload.libraryEntryId ? String(payload.libraryEntryId) : undefined,
      episodeNumber:
        payload.episodeNumber !== undefined && payload.episodeNumber !== null
          ? Number(payload.episodeNumber)
          : undefined,
      seasonNumber:
        payload.seasonNumber !== undefined && payload.seasonNumber !== null
          ? Number(payload.seasonNumber)
          : undefined,
    });

    const session = tabId ? getTabTrackingSession(tabId) : null;
    return { success: result.success, session, error: result.error };
  }

  // 8. Popup: Delete episode progress
  if (type === 'TRACKING_DELETE_PROGRESS') {
    let tabId = Number(payload.tabId);
    if (!tabId || isNaN(tabId)) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id || 0;
    }

    const result = await deleteTabEpisodeProgress(tabId, {
      libraryEntryId: payload.libraryEntryId ? String(payload.libraryEntryId) : undefined,
      episodeNumber:
        payload.episodeNumber !== undefined && payload.episodeNumber !== null
          ? Number(payload.episodeNumber)
          : undefined,
      seasonNumber:
        payload.seasonNumber !== undefined && payload.seasonNumber !== null
          ? Number(payload.seasonNumber)
          : undefined,
    });

    const session = tabId ? getTabTrackingSession(tabId) : null;
    return { success: result.success, session, error: result.error };
  }

  // 9. Popup: Correct episode
  if (type === 'TRACKING_CORRECT_EPISODE') {
    let tabId = Number(payload.tabId);
    if (!tabId || isNaN(tabId)) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id || 0;
    }

    const correctedEpisodeNumber = Number(payload.correctedEpisodeNumber);
    if (!correctedEpisodeNumber || isNaN(correctedEpisodeNumber) || correctedEpisodeNumber <= 0) {
      return { success: false, error: 'Nomor episode perbaikan tidak valid.' };
    }

    const result = await correctTabEpisode(tabId, {
      correctedEpisodeNumber,
      libraryEntryId: payload.libraryEntryId ? String(payload.libraryEntryId) : undefined,
      currentEpisodeNumber:
        payload.currentEpisodeNumber !== undefined && payload.currentEpisodeNumber !== null
          ? Number(payload.currentEpisodeNumber)
          : undefined,
      seasonNumber:
        payload.seasonNumber !== undefined && payload.seasonNumber !== null
          ? Number(payload.seasonNumber)
          : undefined,
    });

    const session = tabId ? getTabTrackingSession(tabId) : null;
    return { success: result.success, session, error: result.error };
  }

  return { success: false, error: `Tipe pesan tracking tidak dikenali: ${type}` };
}
