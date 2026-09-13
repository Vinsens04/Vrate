import {
  extensionMessageSchema,
  type ExtensionAuthResponse,
  type ExtensionMessage,
} from './schemas.ts';
import {
  getAuthState,
  openWebUrl,
  signIn,
  signOut,
} from './service.ts';

/**
 * Dispatches and executes runtime messages in the background service worker.
 * Strictly verifies sender to prevent untrusted content scripts from accessing auth functions.
 */
export async function handleExtensionMessage(
  rawMessage: unknown,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  // Disallow content scripts (which possess sender.tab) from triggering privileged auth actions
  if (sender.tab) {
    return {
      success: false,
      error: 'Operasi autentikasi tidak diizinkan dari konteks halaman web (content script).',
    };
  }

  const parsed = extensionMessageSchema.safeParse(rawMessage);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Format pesan runtime tidak valid.',
    };
  }

  const message: ExtensionMessage = parsed.data;

  switch (message.type) {
    case 'AUTH_GET_STATE':
    case 'AUTH_REFRESH':
    case 'AUTH_GET_PROFILE':
      return await getAuthState();

    case 'AUTH_SIGN_IN':
      return await signIn(message.payload.email, message.payload.password);

    case 'AUTH_SIGN_OUT':
      return await signOut();

    case 'OPEN_DASHBOARD':
      await openWebUrl('/dashboard');
      return { success: true };

    case 'OPEN_URL':
      await openWebUrl(message.payload.url);
      return { success: true };

    default:
      return {
        success: false,
        error: 'Tipe pesan tidak didukung.',
      };
  }
}

/**
 * Strongly-typed wrapper around chrome.runtime.sendMessage for popup and extension UI.
 * Handles background suspension and runtime errors cleanly.
 */
export function sendExtensionMessage<T = ExtensionAuthResponse>(
  message: ExtensionMessage
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      reject(new Error('Browser extension runtime messaging API unavailable.'));
      return;
    }

    try {
      chrome.runtime.sendMessage(message, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message || 'Failed to communicate with background service worker.'));
          return;
        }

        resolve(response as T);
      });
    } catch (err: unknown) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
