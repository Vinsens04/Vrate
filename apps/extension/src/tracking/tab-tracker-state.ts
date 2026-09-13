/**
 * ==============================================================================
 * BACKGROUND TAB TRACKER STATE MANAGER (Step 8)
 * ==============================================================================
 * Manages active tracking sessions isolated per browser tab in the Background
 * Service Worker with full automatic episode tracking and 30-second confirmation.
 *
 * Security & Zero-Token Guarantee:
 * - Content script and Popup NEVER touch or see Supabase access tokens.
 * - Background worker solely fetches tokens and calls Next.js Extension API.
 * - Handles tab closures, navigations, logout cleanups, and offline queues.
 * ==============================================================================
 */

import { getAccessToken } from '../auth/service.ts';
import { getExtensionConfig } from '../config/env.ts';
import { TrackingQueue } from './session-queue.ts';
import {
  type TrackingStatus,
  type TrackingEventType,
  type StartTrackingRequest,
  type CheckpointTrackingRequest,
  type StopTrackingRequest,
  type TrackingOperationResponse,
  AUTO_TRACK_CONFIRMATION_SECONDS,
} from '@vrate/shared';
import type { DetectedMediaCandidate } from '../detection/types.ts';

export interface TabTrackingSession {
  tabId: number;
  clientSessionId: string;
  sessionGeneration: number;
  candidate?: DetectedMediaCandidate | null;
  libraryEntryId: string;
  mediaId: string;
  episodeNumber: number | null;
  seasonNumber: number | null;
  sourceName: string;
  sourceDomain: string;
  sourceUrl: string | null;
  status: TrackingStatus;
  progressSeconds: number;
  durationSeconds: number | null;
  watchedSeconds: number;
  accumulatedRealWatchedSeconds: number;
  isPersistedToLibrary: boolean;
  isCompleted: boolean;
  lastCheckpointAt: number;
  iframeDomain?: string;
  error?: string;
}

// In-memory active tracking sessions indexed by tabId
const activeSessions = new Map<number, TabTrackingSession>();

// Generational counter per tab to reject late events from old episodes / iframes
const tabGenerations = new Map<number, number>();

export function getTabGeneration(tabId: number): number {
  return tabGenerations.get(tabId) || 0;
}

export function incrementTabGeneration(tabId: number): number {
  const nextGen = (tabGenerations.get(tabId) || 0) + 1;
  tabGenerations.set(tabId, nextGen);
  return nextGen;
}

/**
 * Initializes tab listeners to cleanly tear down tracking sessions when tabs close or navigate away.
 */
export function initTrackingTabListeners(): void {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;

  // 1. Tab closed
  chrome.tabs.onRemoved.addListener((tabId) => {
    const session = activeSessions.get(tabId);
    if (session) {
      void stopTrackingSession(tabId, 'tab_closed');
    }
    tabGenerations.delete(tabId);
  });

  // 2. Tab navigated to new page
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
      const session = activeSessions.get(tabId);
      if (session && session.sourceUrl && changeInfo.url !== session.sourceUrl) {
        // Tab changed page URL, stop current session
        void stopTrackingSession(tabId, 'episode_change');
      }
    }
  });
}

/**
 * Gets current tracking session for a tab.
 */
export function getTabTrackingSession(tabId: number): TabTrackingSession | null {
  return activeSessions.get(tabId) || null;
}

/**
 * Sets or updates tracking status for a tab.
 */
export function updateTabTrackingStatus(
  tabId: number,
  status: TrackingStatus,
  details?: { iframeDomain?: string; error?: string },
  generation?: number
): void {
  const session = activeSessions.get(tabId);
  if (session) {
    if (generation !== undefined && generation !== session.sessionGeneration) {
      return;
    }
    session.status = status;
    if (details?.iframeDomain) session.iframeDomain = details.iframeDomain;
    if (details?.error) session.error = details.error;
  }
}

/**
 * Real-time in-memory update for position & duration from content script ticks.
 */
export function updateTabTrackingPosition(
  tabId: number,
  progressSeconds: number,
  durationSeconds: number | null,
  generation?: number
): void {
  const session = activeSessions.get(tabId);
  if (session) {
    if (generation !== undefined && generation !== session.sessionGeneration) {
      return;
    }
    session.progressSeconds = progressSeconds;
    if (durationSeconds !== null && durationSeconds > 0) {
      session.durationSeconds = durationSeconds;
    }
  }
}

/**
 * Pings content script on a tab to verify responsiveness.
 */
export async function isContentScriptReady(tabId: number): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) return false;
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, { type: 'TRACKING_PING' }, (res) => {
        if (chrome.runtime?.lastError || !res || !res.alive) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Dynamically injects content script into a tab if not already present.
 */
export async function ensureContentScriptInjected(tabId: number): Promise<boolean> {
  const ready = await isContentScriptReady(tabId);
  if (ready) return true;

  if (typeof chrome !== 'undefined' && chrome.scripting?.executeScript) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/content.js'],
      });
      // Allow brief moment for initialization
      await new Promise((r) => setTimeout(r, 120));
      return await isContentScriptReady(tabId);
    } catch {
      return false;
    }
  }
  return false;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Automatic episode tracking coordinator.
 * Invoked when candidate media/episode is discovered from the top frame.
 */
export async function handleCandidateAutoTracking(
  tabId: number,
  tabUrl: string,
  candidate: DetectedMediaCandidate
): Promise<void> {
  const existingSession = activeSessions.get(tabId);

  // Check if existing session is already tracking this exact media and episode
  if (existingSession) {
    const isSameEpisode =
      existingSession.episodeNumber === (candidate.episodeNumber ?? 1) &&
      existingSession.seasonNumber === (candidate.seasonNumber ?? null);

    const isSameMedia =
      (candidate.externalId &&
        (existingSession.mediaId === candidate.externalId ||
          existingSession.candidate?.externalId === candidate.externalId)) ||
      (candidate.titleHint && existingSession.candidate?.titleHint === candidate.titleHint);

    if (isSameEpisode && isSameMedia) {
      // Already tracking this episode, do not disrupt
      return;
    }

    // Episode or media changed: flush & close previous session if it was persisted
    await stopTrackingSession(tabId, 'episode_change');
  }

  // Generate new session generation for this episode
  const generation = incrementTabGeneration(tabId);
  const clientSessionId = generateUUID();

  const session: TabTrackingSession = {
    tabId,
    clientSessionId,
    sessionGeneration: generation,
    candidate,
    libraryEntryId: '',
    mediaId: candidate.externalId || '',
    episodeNumber: candidate.episodeNumber ?? 1,
    seasonNumber: candidate.seasonNumber ?? null,
    sourceName: candidate.sourceName,
    sourceDomain: candidate.sourceDomain,
    sourceUrl: tabUrl,
    status: 'tracking',
    progressSeconds: 0,
    durationSeconds: null,
    watchedSeconds: 0,
    accumulatedRealWatchedSeconds: 0,
    isPersistedToLibrary: false,
    isCompleted: false,
    lastCheckpointAt: Date.now(),
  };

  activeSessions.set(tabId, session);

  // Notify Content Script / iframes on this tab to attach with this generation
  try {
    if (chrome.tabs?.sendMessage) {
      chrome.tabs.sendMessage(
        tabId,
        {
          type: 'TRACKING_ATTACH',
          payload: {
            libraryEntryId: '',
            initialProgressSeconds: 0,
            durationSeconds: null,
            generation,
          },
        },
        () => {
          void chrome.runtime.lastError;
        }
      );
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Starts a new tracking session on a tab explicitly (e.g. from popup).
 */
export async function startTrackingSession(
  tabId: number,
  params: {
    libraryEntryId: string;
    mediaId?: string;
    episodeNumber?: number | null;
    seasonNumber?: number | null;
    sourceName: string;
    sourceDomain: string;
    sourceUrl?: string | null;
    initialProgressSeconds?: number;
    durationSeconds?: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Silakan login terlebih dahulu untuk melacak tontonan.' };
  }

  await ensureContentScriptInjected(tabId);

  const generation = incrementTabGeneration(tabId);
  const clientSessionId = generateUUID();

  const session: TabTrackingSession = {
    tabId,
    clientSessionId,
    sessionGeneration: generation,
    libraryEntryId: params.libraryEntryId,
    mediaId: params.mediaId || params.libraryEntryId,
    episodeNumber: params.episodeNumber ?? null,
    seasonNumber: params.seasonNumber ?? null,
    sourceName: params.sourceName,
    sourceDomain: params.sourceDomain,
    sourceUrl: params.sourceUrl ?? null,
    status: 'syncing',
    progressSeconds: params.initialProgressSeconds ?? 0,
    durationSeconds: params.durationSeconds ?? null,
    watchedSeconds: 0,
    accumulatedRealWatchedSeconds: AUTO_TRACK_CONFIRMATION_SECONDS,
    isPersistedToLibrary: true,
    isCompleted: false,
    lastCheckpointAt: Date.now(),
  };

  activeSessions.set(tabId, session);

  // Notify Content Script on this tab to activate video tracking
  let initialStatus: TrackingStatus = 'syncing';
  let initialDetails: { iframeDomain?: string; error?: string } | undefined;

  try {
    const attachResult = await new Promise<{
      status?: TrackingStatus;
      details?: { iframeDomain?: string; error?: string };
    }>((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        {
          type: 'TRACKING_ATTACH',
          payload: {
            libraryEntryId: session.libraryEntryId,
            initialProgressSeconds: session.progressSeconds,
            durationSeconds: session.durationSeconds,
            generation,
          },
        },
        (res) => {
          if (chrome.runtime?.lastError) {
            resolve({});
          } else {
            resolve(res || {});
          }
        }
      );
    });

    if (attachResult.status) {
      initialStatus = attachResult.status;
      initialDetails = attachResult.details;
    }
  } catch {
    // Non-fatal
  }

  // Call Next.js extension tracking API
  try {
    const config = getExtensionConfig();
    const isMediaIdUuid =
      params.mediaId &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        params.mediaId
      );

    const body: StartTrackingRequest = {
      clientSessionId: session.clientSessionId,
      libraryEntryId: session.libraryEntryId,
      ...(isMediaIdUuid ? { mediaId: params.mediaId } : {}),
      episodeNumber: session.episodeNumber,
      seasonNumber: session.seasonNumber,
      sourceName: session.sourceName,
      sourceDomain: session.sourceDomain,
      sourceUrl: session.sourceUrl,
      initialProgressSeconds: session.progressSeconds,
      durationSeconds: session.durationSeconds,
    };

    const res = await fetch(`${config.webAppUrl}/api/extension/tracking?action=start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      session.status = 'error';
      session.error = errJson.error || `HTTP ${res.status}`;
      return { success: false, error: session.error };
    }

    session.status = initialStatus === 'syncing' ? 'tracking' : initialStatus;
    if (initialDetails?.iframeDomain) session.iframeDomain = initialDetails.iframeDomain;
    if (initialDetails?.error) session.error = initialDetails.error;
    return { success: true };
  } catch (err: unknown) {
    session.status = 'offline_queued';
    session.error = err instanceof Error ? err.message : 'Jaringan tidak dapat diakses.';
    return { success: true };
  }
}

/**
 * Handles a progress checkpoint sent by the Content Script on a tab.
 * Enforces:
 * 1. Generation ID matching (reject late events from old episode/iframe).
 * 2. Minimum duration filter (ignore clips/ads < 60s).
 * 3. 30-second accumulated real playback threshold before database write.
 */
export async function handleCheckpointFromTab(
  tabId: number,
  payload: {
    progressSeconds: number;
    durationSeconds: number | null;
    watchedDeltaSeconds: number;
    playbackRate: number;
    eventType: TrackingEventType;
    isEnded: boolean;
    generation?: number;
  }
): Promise<void> {
  const session = activeSessions.get(tabId);
  if (!session) return;

  // 1. Generation check: reject late events from old episode or old iframe
  if (payload.generation !== undefined && payload.generation !== session.sessionGeneration) {
    return;
  }

  // 2. Short video filter: ignore videos < 60s (trailers, ads, bumper)
  if (payload.durationSeconds !== null && payload.durationSeconds > 0 && payload.durationSeconds < 60) {
    return;
  }

  // 3. Accumulate playback and update in-memory state
  session.progressSeconds = payload.progressSeconds;
  if (payload.durationSeconds !== null && payload.durationSeconds > 0) {
    session.durationSeconds = payload.durationSeconds;
  }
  session.watchedSeconds += payload.watchedDeltaSeconds;
  session.accumulatedRealWatchedSeconds += payload.watchedDeltaSeconds;
  session.lastCheckpointAt = Date.now();

  // 4. Playback confirmation threshold check (30 seconds or ended)
  const isConfirmed =
    session.accumulatedRealWatchedSeconds >= AUTO_TRACK_CONFIRMATION_SECONDS ||
    payload.isEnded;

  if (!session.isPersistedToLibrary) {
    // If threshold not reached yet, DO NOT write to database
    if (!isConfirmed) {
      session.status = 'tracking';
      return;
    }

    // Threshold reached! Persist to library and start watch session
    const token = await getAccessToken();
    if (!token) {
      session.status = 'offline_queued';
      return;
    }

    const config = getExtensionConfig();

    try {
      // Step A: Add to library if libraryEntryId is not yet set
      if (!session.libraryEntryId && session.candidate) {
        let resolvedProvider =
          session.candidate.provider === 'unknown' ? 'anilist' : session.candidate.provider;
        let resolvedExternalId = session.candidate.externalId;

        // Try resolving against Vrate catalog
        try {
          const resolveRes = await fetch(`${config.webAppUrl}/api/extension/media/resolve`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              provider: session.candidate.provider,
              externalId: session.candidate.externalId,
              titleHint: session.candidate.titleHint,
              mediaTypeHint: session.candidate.mediaType,
              sourceDomain: session.candidate.sourceDomain,
            }),
          });
          if (resolveRes.ok) {
            const resolveData = await resolveRes.json();
            if (resolveData.candidates && resolveData.candidates.length > 0) {
              const matched = resolveData.candidates[0];
              resolvedProvider = matched.provider;
              resolvedExternalId = matched.externalId;
            }
          }
        } catch {
          // ignore resolve failure, fallback to candidate
        }

        if (resolvedExternalId) {
          const addRes = await fetch(`${config.webAppUrl}/api/extension/library`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              provider: resolvedProvider,
              externalId: resolvedExternalId,
              initialStatus: 'watching',
              episodeHint: session.episodeNumber,
              sourceName: session.sourceName,
              sourceDomain: session.sourceDomain,
            }),
          });

          if (addRes.ok) {
            const addData = await addRes.json();
            if (addData.entryId) {
              session.libraryEntryId = addData.entryId;
              session.mediaId = addData.mediaId || resolvedExternalId;
            }
          }
        }
      }

      if (!session.libraryEntryId) {
        session.status = 'error';
        session.error = 'Failed to automatically add media to library.';
        return;
      }

      // Step B: Start watch session on backend
      const startBody: StartTrackingRequest = {
        clientSessionId: session.clientSessionId,
        libraryEntryId: session.libraryEntryId,
        episodeNumber: session.episodeNumber,
        seasonNumber: session.seasonNumber,
        sourceName: session.sourceName,
        sourceDomain: session.sourceDomain,
        sourceUrl: session.sourceUrl,
        initialProgressSeconds: session.progressSeconds,
        durationSeconds: session.durationSeconds,
      };

      const startRes = await fetch(`${config.webAppUrl}/api/extension/tracking?action=start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(startBody),
      });

      if (!startRes.ok) {
        const errJson = await startRes.json().catch(() => ({}));
        session.status = 'error';
        session.error = errJson.error || `HTTP ${startRes.status}`;
        return;
      }

      session.isPersistedToLibrary = true;
    } catch (err: unknown) {
      session.status = 'offline_queued';
      session.error = err instanceof Error ? err.message : 'Jaringan tidak dapat diakses.';
      return;
    }
  }

  // 5. Checkpoint to backend
  const checkpointReq: CheckpointTrackingRequest = {
    clientSessionId: session.clientSessionId,
    libraryEntryId: session.libraryEntryId,
    episodeNumber: session.episodeNumber,
    seasonNumber: session.seasonNumber,
    progressSeconds: session.progressSeconds,
    durationSeconds: session.durationSeconds,
    watchedDeltaSeconds: payload.watchedDeltaSeconds,
    playbackRate: payload.playbackRate,
    eventType: payload.eventType,
    isEnded: payload.isEnded,
  };

  const token = await getAccessToken();
  if (!token) {
    await TrackingQueue.enqueue(checkpointReq);
    session.status = 'offline_queued';
    return;
  }

  try {
    const config = getExtensionConfig();
    const res = await fetch(`${config.webAppUrl}/api/extension/tracking?action=checkpoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(checkpointReq),
    });

    if (!res.ok) {
      await TrackingQueue.enqueue(checkpointReq);
      session.status = 'offline_queued';
      return;
    }

    const data: TrackingOperationResponse = await res.json();
    if (data.isCompleted) {
      session.isCompleted = true;
    }
    session.status = payload.isEnded ? 'synced' : 'tracking';

    void flushOfflineQueue();
  } catch {
    await TrackingQueue.enqueue(checkpointReq);
    session.status = 'offline_queued';
  }
}

/**
 * Flushes items from offline retry queue when online.
 */
export async function flushOfflineQueue(): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;

  const batch = await TrackingQueue.getReadyBatch(5);
  if (batch.length === 0) return;

  const config = getExtensionConfig();
  const successfulIds: string[] = [];

  for (const item of batch) {
    try {
      const res = await fetch(`${config.webAppUrl}/api/extension/tracking?action=checkpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(item.request),
      });

      if (res.ok) {
        successfulIds.push(item.id);
      } else {
        await TrackingQueue.recordAttempt(item.id, `HTTP ${res.status}`);
      }
    } catch (err: unknown) {
      await TrackingQueue.recordAttempt(
        item.id,
        err instanceof Error ? err.message : 'Network error'
      );
    }
  }

  if (successfulIds.length > 0) {
    await TrackingQueue.remove(successfulIds);
  }
}

/**
 * Stops an active tracking session for a tab.
 * If the session was never confirmed (< 30s), it closes silently with zero DB writes.
 */
export async function stopTrackingSession(
  tabId: number,
  reason: 'user_stop' | 'episode_change' | 'ended' | 'tab_closed' | 'dismissed' = 'user_stop'
): Promise<void> {
  const session = activeSessions.get(tabId);
  if (!session) return;

  activeSessions.delete(tabId);

  // Notify Content Script to detach video listeners
  try {
    chrome.tabs.sendMessage(tabId, { type: 'TRACKING_DETACH' }, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    // Non-fatal
  }

  // If session was never persisted to DB, nothing to stop on backend
  if (!session.isPersistedToLibrary || !session.libraryEntryId) {
    return;
  }

  const token = await getAccessToken();
  if (!token) return;

  try {
    const config = getExtensionConfig();
    const body: StopTrackingRequest = {
      clientSessionId: session.clientSessionId,
      libraryEntryId: session.libraryEntryId,
      episodeNumber: session.episodeNumber,
      seasonNumber: session.seasonNumber,
      finalProgressSeconds: session.progressSeconds,
      durationSeconds: session.durationSeconds,
      watchedDeltaSeconds: 0,
      reason,
    };

    await fetch(`${config.webAppUrl}/api/extension/tracking?action=stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Non-fatal on teardown
  }
}

/**
 * Marks current tab's episode as completed via API.
 */
export async function markTabEpisodeCompleted(
  tabId: number,
  params?: { libraryEntryId?: string; episodeNumber?: number; seasonNumber?: number | null }
): Promise<{ success: boolean; error?: string }> {
  const session = activeSessions.get(tabId);
  const libraryEntryId = params?.libraryEntryId || session?.libraryEntryId;
  const episodeNumber = params?.episodeNumber ?? session?.episodeNumber ?? 1;
  const seasonNumber = params?.seasonNumber ?? session?.seasonNumber ?? null;

  if (!libraryEntryId) {
    return { success: false, error: 'Media belum tersimpan di library.' };
  }

  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Sesi ekstensi belum terautentikasi.' };
  }

  try {
    const config = getExtensionConfig();
    const res = await fetch(`${config.webAppUrl}/api/extension/tracking?action=mark_completed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ libraryEntryId, episodeNumber, seasonNumber }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }

    if (session) {
      session.isCompleted = true;
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to mark as completed.',
    };
  }
}

/**
 * Deletes current tab's episode progress via API.
 */
export async function deleteTabEpisodeProgress(
  tabId: number,
  params?: { libraryEntryId?: string; episodeNumber?: number; seasonNumber?: number | null }
): Promise<{ success: boolean; error?: string }> {
  const session = activeSessions.get(tabId);
  const libraryEntryId = params?.libraryEntryId || session?.libraryEntryId;
  const episodeNumber = params?.episodeNumber ?? session?.episodeNumber ?? 1;
  const seasonNumber = params?.seasonNumber ?? session?.seasonNumber ?? null;

  if (!libraryEntryId) {
    return { success: false, error: 'Media is not in library yet.' };
  }

  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Extension session is not authenticated.' };
  }

  try {
    const config = getExtensionConfig();
    const res = await fetch(`${config.webAppUrl}/api/extension/tracking?action=delete_progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ libraryEntryId, episodeNumber, seasonNumber }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }

    if (session) {
      session.progressSeconds = 0;
      session.watchedSeconds = 0;
      session.accumulatedRealWatchedSeconds = 0;
      session.isCompleted = false;
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete progress.',
    };
  }
}

/**
 * Corrects current tab's episode number via API.
 */
export async function correctTabEpisode(
  tabId: number,
  params: {
    correctedEpisodeNumber: number;
    libraryEntryId?: string;
    currentEpisodeNumber?: number;
    seasonNumber?: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = activeSessions.get(tabId);
  const libraryEntryId = params.libraryEntryId || session?.libraryEntryId;
  const currentEpisodeNumber = params.currentEpisodeNumber ?? session?.episodeNumber ?? 1;
  const seasonNumber = params.seasonNumber ?? session?.seasonNumber ?? null;

  if (!libraryEntryId) {
    return { success: false, error: 'Media is not in library yet.' };
  }

  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Extension session is not authenticated.' };
  }

  try {
    const config = getExtensionConfig();
    const res = await fetch(`${config.webAppUrl}/api/extension/tracking?action=correct_episode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        libraryEntryId,
        currentEpisodeNumber,
        correctedEpisodeNumber: params.correctedEpisodeNumber,
        seasonNumber,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }

    if (session) {
      session.episodeNumber = params.correctedEpisodeNumber;
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to correct episode.',
    };
  }
}

/**
 * Clear all tracking sessions (e.g. on user logout).
 */
export function clearAllTrackingSessions(): void {
  for (const tabId of activeSessions.keys()) {
    try {
      chrome.tabs.sendMessage(tabId, { type: 'TRACKING_DETACH' }, () => {
        void chrome.runtime.lastError;
      });
    } catch {
      // safe
    }
  }
  activeSessions.clear();
  tabGenerations.clear();
}
