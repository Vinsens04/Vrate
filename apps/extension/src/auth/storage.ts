import type { SupportedStorage } from '@supabase/supabase-js';

export const STORAGE_PREFIX = 'vrate.auth.';

/**
 * Ensures the storage key begins with the Vrate namespace prefix.
 */
export function getPrefixedKey(key: string): string {
  return key.startsWith(STORAGE_PREFIX) ? key : `${STORAGE_PREFIX}${key}`;
}

/**
 * Initializes the storage access level to TRUSTED_CONTEXTS.
 * This prevents content scripts running in web pages from reading auth tokens.
 * Safe fallback for browsers or environments that do not support setAccessLevel.
 */
export async function initStorageAccessLevel(): Promise<void> {
  if (
    typeof chrome !== 'undefined' &&
    chrome.storage?.local &&
    typeof (chrome.storage.local as any).setAccessLevel === 'function'
  ) {
    try {
      await (chrome.storage.local as any).setAccessLevel({
        accessLevel: 'TRUSTED_CONTEXTS',
      });
    } catch {
      // Non-fatal fallback on older browser engines
    }
  }
}

/**
 * Custom Supabase storage adapter based strictly on chrome.storage.local.
 * - Namespaced with 'vrate.auth.*'
 * - Asynchronous operations
 * - Does NOT touch other extension keys or invoke clear()
 */
export class ChromeLocalStorageAdapter implements SupportedStorage {
  async getItem(key: string): Promise<string | null> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return null;
    }

    const prefixedKey = getPrefixedKey(key);
    try {
      const result = await chrome.storage.local.get(prefixedKey);
      const value = result[prefixedKey];
      return typeof value === 'string' ? value : null;
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return;
    }

    const prefixedKey = getPrefixedKey(key);
    try {
      await chrome.storage.local.set({ [prefixedKey]: value });
    } catch {
      // Storage error handled gracefully
    }
  }

  async removeItem(key: string): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return;
    }

    const prefixedKey = getPrefixedKey(key);
    try {
      await chrome.storage.local.remove(prefixedKey);
    } catch {
      // Storage error handled gracefully
    }
  }
}

export const extensionStorageAdapter = new ChromeLocalStorageAdapter();

/**
 * Clears ONLY Vrate authentication keys from chrome.storage.local.
 * Never calls chrome.storage.local.clear() to preserve user and extension settings.
 */
export async function clearVrateAuthStorage(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return;
  }

  try {
    const allItems = await chrome.storage.local.get(null);
    const authKeysToRemove = Object.keys(allItems).filter((key) =>
      key.startsWith(STORAGE_PREFIX)
    );

    if (authKeysToRemove.length > 0) {
      await chrome.storage.local.remove(authKeysToRemove);
    }
  } catch {
    // Storage error handled gracefully
  }
}
