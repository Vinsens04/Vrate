import { handleExtensionMessage } from '../src/auth/messages';
import { initAuthService } from '../src/auth/service';
import {
  handleDetectionMessage,
  initDetectionTabListeners,
  syncMiruroContentScriptRegistration,
} from '../src/detection/messages';

export default defineBackground(() => {
  // Initialize storage access level and prepare client
  initAuthService().catch(() => {
    // Graceful startup
  });

  // Synchronize dynamic script registration for optional Miruro permissions across restarts
  syncMiruroContentScriptRegistration().catch(() => {
    // Graceful startup
  });

  // Initialize tab navigation listeners for badge and candidate cleanup
  initDetectionTabListeners();

  // Central runtime message listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== 'object') {
      sendResponse({ success: false, error: 'Pesan tidak valid.' });
      return false;
    }

    const type = String((message as Record<string, unknown>).type || '');

    // Dispatch detection namespace
    if (type.startsWith('DETECTION_')) {
      handleDetectionMessage(message, sender)
        .then((response) => {
          sendResponse(response);
        })
        .catch((err) => {
          sendResponse({
            success: false,
            error: err instanceof Error ? err.message : 'Kesalahan sistem deteksi background.',
          });
        });
      return true;
    }

    // Dispatch authentication and generic popup actions namespace
    if (type.startsWith('AUTH_') || type === 'OPEN_DASHBOARD' || type === 'OPEN_URL') {
      handleExtensionMessage(message, sender)
        .then((response) => {
          sendResponse(response);
        })
        .catch((err) => {
          sendResponse({
            success: false,
            error: err instanceof Error ? err.message : 'Kesalahan sistem background.',
          });
        });
      return true;
    }

    sendResponse({ success: false, error: 'Tipe pesan tidak dikenali.' });
    return false;
  });
});
