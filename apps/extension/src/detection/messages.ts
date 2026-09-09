import { getExtensionConfig } from '../config/env.ts';
import { getAccessToken } from '../auth/service.ts';
import {
  detectionMessageSchema,
  type DetectionMessage,
} from './schemas.ts';
import type {
  DetectedMediaCandidate,
  ResolveMediaResponse,
  AddExtensionLibraryResponse,
} from './types.ts';
import { defaultEngine, extractPageContext } from './engine.ts';
import { isMiruroHost } from './url.ts';

// In-memory candidate cache mapped by tabId
const activeTabCandidates = new Map<number, DetectedMediaCandidate>();

export const MIRURO_PERMISSIONS = {
  origins: ['https://miruro.bz/*', 'https://www.miruro.bz/*'],
};

export const MIRURO_CONTENT_SCRIPT_ID = 'vrate-miruro-detector';

/**
 * Synchronizes dynamic content script registration for Miruro based on granted permissions.
 * Safe across service worker restarts with duplicate-registration guards.
 */
export async function syncMiruroContentScriptRegistration(): Promise<void> {
  if (
    typeof chrome === 'undefined' ||
    !chrome.scripting?.registerContentScripts ||
    !chrome.scripting?.getRegisteredContentScripts
  ) {
    return;
  }

  try {
    const hasPerm = await hasMiruroPermission();
    const existing = await chrome.scripting.getRegisteredContentScripts({
      ids: [MIRURO_CONTENT_SCRIPT_ID],
    });
    const isRegistered = existing.some((s) => s.id === MIRURO_CONTENT_SCRIPT_ID);

    if (hasPerm && !isRegistered) {
      await chrome.scripting.registerContentScripts([
        {
          id: MIRURO_CONTENT_SCRIPT_ID,
          matches: ['https://miruro.bz/*', 'https://www.miruro.bz/*'],
          js: ['content-scripts/content.js'],
          runAt: 'document_idle',
        },
      ]);
    } else if (!hasPerm && isRegistered) {
      await chrome.scripting.unregisterContentScripts({
        ids: [MIRURO_CONTENT_SCRIPT_ID],
      });
    }
  } catch {
    // Non-fatal if browser scripting registration fails
  }
}

/**
 * Checks if the browser extension currently holds optional host permissions for Miruro.
 */
export async function hasMiruroPermission(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions?.contains) {
    return false;
  }
  try {
    return await chrome.permissions.contains(MIRURO_PERMISSIONS);
  } catch {
    return false;
  }
}

/**
 * Requests optional host permission for Miruro.
 * Note: Browser requires this to be initiated directly from a user gesture in the popup.
 */
export async function requestMiruroPermission(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions?.request) {
    return false;
  }
  try {
    const granted = await chrome.permissions.request(MIRURO_PERMISSIONS);
    if (granted) {
      await syncMiruroContentScriptRegistration();
    }
    return granted;
  } catch {
    return false;
  }
}

/**
 * Revokes optional host permission for Miruro.
 */
export async function revokeMiruroPermission(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions?.remove) {
    return false;
  }
  try {
    const removed = await chrome.permissions.remove(MIRURO_PERMISSIONS);
    if (removed) {
      await syncMiruroContentScriptRegistration();
    }
    return removed;
  } catch {
    return false;
  }
}

/**
 * Updates or clears the extension badge for a specific tab.
 */
export async function updateTabBadge(tabId: number, hasCandidate: boolean): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.action?.setBadgeText) {
    return;
  }
  try {
    if (hasCandidate) {
      await chrome.action.setBadgeText({ tabId, text: '1' });
      if (chrome.action.setBadgeBackgroundColor) {
        await chrome.action.setBadgeBackgroundColor({ tabId, color: '#FF5C35' });
      }
    } else {
      await chrome.action.setBadgeText({ tabId, text: '' });
    }
  } catch {
    // Non-fatal if tab is already closed
  }
}

/**
 * Registers tab cleanup listeners to clear badges and cached candidates upon navigation/closure.
 */
export function initDetectionTabListeners(): void {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    return;
  }

  // Clear candidate when tab navigates to a new URL
  if (chrome.tabs.onUpdated?.addListener) {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.url) {
        activeTabCandidates.delete(tabId);
        void updateTabBadge(tabId, false);
      }
    });
  }

  // Clear memory when tab is closed
  if (chrome.tabs.onRemoved?.addListener) {
    chrome.tabs.onRemoved.addListener((tabId) => {
      activeTabCandidates.delete(tabId);
    });
  }
}

/**
 * Core background router for all media detection operations.
 * Strictly separates privileged popup operations from content script messages.
 */
export async function handleDetectionMessage(
  rawMessage: unknown,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  const parsed = detectionMessageSchema.safeParse(rawMessage);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Format pesan deteksi tidak valid.',
    };
  }

  const message: DetectionMessage = parsed.data;

  // 1. Content Script Sender (possesses sender.tab)
  if (sender.tab) {
    // Content scripts are ONLY allowed to send candidate discovery notifications
    if (message.type !== 'DETECTION_CANDIDATE') {
      return {
        success: false,
        error: 'Pesan deteksi tidak diizinkan dari konteks halaman web.',
      };
    }

    const tabId = sender.tab.id;
    const tabUrl = sender.tab.url;

    if (!tabId || !tabUrl) {
      return { success: false, error: 'Konteks tab tidak valid.' };
    }

    const candidate: DetectedMediaCandidate = (message.payload as { candidate: DetectedMediaCandidate }).candidate;

    // Defense-in-depth: Ensure candidate sourceDomain matches trusted sender.tab.url
    try {
      const trustedUrl = new URL(tabUrl);
      const trustedHost = trustedUrl.hostname.toLowerCase();
      const candidateHost = candidate.sourceDomain.toLowerCase();

      // Check domain match
      if (candidate.sourceName === 'miruro' && !isMiruroHost(trustedHost)) {
        return { success: false, error: 'Domain miruro tidak cocok dengan tab asal.' };
      }
      if (!trustedHost.endsWith(candidateHost) && !candidateHost.endsWith(trustedHost)) {
        return { success: false, error: 'Domain sumber tidak valid.' };
      }
    } catch {
      return { success: false, error: 'URL tab tidak valid.' };
    }

    // Cache candidate in background
    activeTabCandidates.set(tabId, candidate);
    await updateTabBadge(tabId, true);

    // Never return tokens, user profile, or private data to content script!
    return { success: true, acknowledged: true };
  }

  // 2. Trusted Internal Extension Sender (Popup / Options - NO sender.tab)
  switch (message.type) {
    case 'DETECTION_GET_CURRENT': {
      let targetTabId = message.payload?.tabId;
      let targetTabUrl = '';

      if (!targetTabId && chrome.tabs?.query) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        targetTabId = activeTab?.id;
        targetTabUrl = activeTab?.url || '';
      }

      if (!targetTabId) {
        return { success: true, candidate: null, status: 'idle' };
      }

      const candidate = activeTabCandidates.get(targetTabId) || null;
      let isMiruroPage = false;
      if (targetTabUrl) {
        try {
          const u = new URL(targetTabUrl);
          isMiruroPage = isMiruroHost(u.hostname);
        } catch {
          // ignore
        }
      }

      const autoPermissionGranted = await hasMiruroPermission();

      return {
        success: true,
        tabId: targetTabId,
        candidate,
        status: candidate ? 'detected' : 'idle',
        isMiruroPage,
        autoPermissionGranted,
      };
    }

    case 'DETECTION_TRIGGER_MANUAL': {
      let targetTabId = message.payload?.tabId;
      if (!targetTabId && chrome.tabs?.query) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        targetTabId = activeTab?.id;
      }

      if (!targetTabId) {
        return { success: false, error: 'Tidak ada tab aktif yang ditemukan.' };
      }

      // Execute in-page extraction via scripting API
      if (!chrome.scripting?.executeScript) {
        return { success: false, error: 'API scripting tidak tersedia di browser ini.' };
      }

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: targetTabId },
          func: () => {
            // Self-contained in-page extraction snippet
            const jsonLdBlocks: unknown[] = [];
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (let i = 0; i < scripts.length && i < 10; i++) {
              const el = scripts[i];
              const text = el?.textContent || '';
              if (text.length > 0 && text.length <= 65536) {
                try {
                  jsonLdBlocks.push(JSON.parse(text));
                } catch {
                  // ignore
                }
              }
            }

            const ogTitle =
              document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
              document.querySelector('meta[name="og:title"]')?.getAttribute('content') ||
              undefined;
            const ogType =
              document.querySelector('meta[property="og:type"]')?.getAttribute('content') ||
              document.querySelector('meta[name="og:type"]')?.getAttribute('content') ||
              undefined;

            const h1Text = document.querySelector('h1')?.textContent?.trim() || undefined;
            const hasVideo = Boolean(document.querySelector('video'));

            return {
              href: window.location.href,
              documentTitle: document.title,
              jsonLd: jsonLdBlocks,
              openGraph: { 'og:title': ogTitle, 'og:type': ogType },
              heading: h1Text,
              videoElementPresent: hasVideo,
            };
          },
        });

        const pageData = results[0]?.result;
        if (!pageData || !pageData.href) {
          return { success: false, error: 'Gagal mengekstrak metadata dari halaman tab aktif.' };
        }

        const url = new URL(pageData.href);
        const context = {
          url,
          documentTitle: pageData.documentTitle,
          jsonLd: pageData.jsonLd as unknown[],
          openGraph: pageData.openGraph as Record<string, string>,
          heading: pageData.heading,
          videoElementPresent: pageData.videoElementPresent,
        };

        const candidate = defaultEngine.detect(context);
        if (candidate) {
          activeTabCandidates.set(targetTabId, candidate);
          await updateTabBadge(targetTabId, true);
        } else {
          activeTabCandidates.delete(targetTabId);
          await updateTabBadge(targetTabId, false);
        }

        return {
          success: true,
          candidate,
          status: candidate ? 'detected' : 'unrecognized',
        };
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Gagal menjalankan deteksi pada tab aktif.',
        };
      }
    }

    case 'DETECTION_RESOLVE_MEDIA': {
      const token = await getAccessToken();
      if (!token) {
        return {
          success: false,
          error: 'Sesi ekstensi belum terautentikasi. Silakan masuk terlebih dahulu.',
        };
      }

      const { webAppUrl } = getExtensionConfig();
      const endpoint = `${webAppUrl}/api/extension/media/resolve`;

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(message.payload),
        });

        const data = (await res.json()) as ResolveMediaResponse;
        return data;
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Gagal menghubungi server resolusi Vrate.',
        };
      }
    }

    case 'DETECTION_ADD_TO_LIBRARY': {
      const token = await getAccessToken();
      if (!token) {
        return {
          success: false,
          error: 'Sesi ekstensi belum terautentikasi. Silakan masuk terlebih dahulu.',
        };
      }

      const { webAppUrl } = getExtensionConfig();
      const endpoint = `${webAppUrl}/api/extension/library`;

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(message.payload),
        });

        const data = (await res.json()) as AddExtensionLibraryResponse;

        // If successfully added or already exists, clear badge
        if (data.success && chrome.tabs?.query) {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            activeTabCandidates.delete(activeTab.id);
            await updateTabBadge(activeTab.id, false);
          }
        }

        return data;
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Gagal menambahkan media ke library.',
        };
      }
    }

    case 'DETECTION_DISMISS_CANDIDATE': {
      let targetTabId = message.payload?.tabId;
      if (!targetTabId && chrome.tabs?.query) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        targetTabId = activeTab?.id;
      }

      if (targetTabId) {
        activeTabCandidates.delete(targetTabId);
        await updateTabBadge(targetTabId, false);
      }

      return { success: true };
    }

    case 'DETECTION_CHECK_AUTO_PERMISSION': {
      const granted = await hasMiruroPermission();
      return { success: true, granted };
    }

    default:
      return { success: false, error: 'Tipe pesan deteksi tidak didukung.' };
  }
}
