import { defaultEngine, extractPageContext } from '../src/detection/engine';
import type { DetectedMediaCandidate } from '../src/detection/types';

export default defineContentScript({
  // Only matched statically on localhost; Miruro is registered dynamically via optional_host_permissions
  matches: ['http://localhost:3000/*'],
  main() {
    let lastUrl = window.location.href;
    let lastFingerprint = '';
    let playbackTimer: ReturnType<typeof setTimeout> | null = null;
    let currentCandidate: DetectedMediaCandidate | null = null;

    function clearPlaybackTimer() {
      if (playbackTimer !== null) {
        clearTimeout(playbackTimer);
        playbackTimer = null;
      }
    }

    function computeCandidateFingerprint(c: DetectedMediaCandidate): string {
      return `${c.sourceName}:${c.provider}:${c.externalId || c.titleHint}:${c.episodeNumber || ''}:${c.mediaType || ''}`;
    }

    function sendCandidateToBackground(candidate: DetectedMediaCandidate) {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        return;
      }
      try {
        chrome.runtime.sendMessage(
          {
            type: 'DETECTION_CANDIDATE',
            payload: { candidate },
          },
          () => {
            // Check for lastError silently to avoid unhandled runtime error
            void chrome.runtime.lastError;
          }
        );
      } catch {
        // Context invalidated
      }
    }

    function setupPlaybackListener(video: HTMLVideoElement) {
      const handlePlay = () => {
        clearPlaybackTimer();

        // 30 seconds playback confirmation (Step 7 requirement: no progress tracking, just eligibility)
        playbackTimer = setTimeout(() => {
          if (!video.paused && !video.ended && currentCandidate) {
            currentCandidate = {
              ...currentCandidate,
              playbackConfirmed: true,
            };
            sendCandidateToBackground(currentCandidate);
          }
        }, 30000);
      };

      const handleStop = () => {
        clearPlaybackTimer();
      };

      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handleStop);
      video.addEventListener('ended', handleStop);
      video.addEventListener('emptied', handleStop);

      // If already playing when detected
      if (!video.paused && !video.ended) {
        handlePlay();
      }
    }

    function inspectPage() {
      try {
        const context = extractPageContext(document, window.location.href);
        if (!context) {
          return;
        }

        const candidate = defaultEngine.detect(context);
        if (candidate) {
          currentCandidate = candidate;
          const fingerprint = computeCandidateFingerprint(candidate);
          if (fingerprint !== lastFingerprint) {
            lastFingerprint = fingerprint;
            sendCandidateToBackground(candidate);
          }

          // Inspect main-frame video element for playback eligibility
          const video = document.querySelector('video');
          if (video instanceof HTMLVideoElement) {
            setupPlaybackListener(video);
          }
        } else {
          clearPlaybackTimer();
          currentCandidate = null;
          lastFingerprint = '';
        }
      } catch {
        // Safe execution without breaking page scripts
      }
    }

    function onLocationChange() {
      const newUrl = window.location.href;
      if (newUrl !== lastUrl) {
        lastUrl = newUrl;
        clearPlaybackTimer();
        lastFingerprint = '';
        currentCandidate = null;

        // Debounce slightly to allow dynamic page/DOM updates
        setTimeout(inspectPage, 400);
      }
    }

    // 1. Initial page run
    inspectPage();

    // 2. SPA Navigation hooks
    window.addEventListener('popstate', onLocationChange);

    try {
      const originalPushState = history.pushState;
      history.pushState = function (...args) {
        const result = originalPushState.apply(this, args);
        onLocationChange();
        return result;
      };

      const originalReplaceState = history.replaceState;
      history.replaceState = function (...args) {
        const result = originalReplaceState.apply(this, args);
        onLocationChange();
        return result;
      };
    } catch {
      // Non-fatal if page sandbox forbids wrapping history methods
    }

    // 3. Debounced MutationObserver for SPA changes (e.g. next/router, React Router)
    let mutationDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        onLocationChange();
      } else if (!currentCandidate) {
        // If not detected yet, check once if heading or video appears
        if (mutationDebounceTimer !== null) {
          clearTimeout(mutationDebounceTimer);
        }
        mutationDebounceTimer = setTimeout(inspectPage, 1000);
      }
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  },
});
