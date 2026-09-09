/**
 * ==============================================================================
 * HTML5 PLAYER SELECTOR & OBSERVER (Step 8)
 * ==============================================================================
 * Discovers, scores, and tracks the primary HTML5 video element on streaming
 * and web media pages. Supports dynamic SPA replacements and clean listener
 * lifecycles.
 * ==============================================================================
 */

export interface VideoScoreFactors {
  visualArea: number;
  duration: number;
  isPlaying: boolean;
  hasPlayed: boolean;
  isVisible: boolean;
  isTiny: boolean;
  isBackgroundAnimation: boolean;
  score: number;
}

export const MIN_CONTENT_DURATION_SECONDS = 60;
export const MIN_CONTENT_WIDTH = 240;
export const MIN_CONTENT_HEIGHT = 135;

/**
 * Checks if a video element is visible and rendered in the DOM.
 */
export function isElementVisible(el: HTMLElement): boolean {
  if (!el || typeof el.getBoundingClientRect !== 'function') return false;

  const style = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(el) : null;
  if (style) {
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) {
      return false;
    }
  }

  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Calculates a priority score for candidate video elements.
 * Higher score indicates higher likelihood of being the main feature content.
 */
export function calculateVideoScore(video: HTMLVideoElement): number {
  if (!video) return -1;

  let width = video.videoWidth || 0;
  let height = video.videoHeight || 0;

  if (typeof video.getBoundingClientRect === 'function') {
    const rect = video.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      width = Math.max(width, rect.width);
      height = Math.max(height, rect.height);
    }
  }

  const visualArea = width * height;
  const isVisible = isElementVisible(video);
  if (!isVisible && visualArea === 0) return -1;

  // Ignore tiny previews, tracking pixels, or thumbnails
  if (width < MIN_CONTENT_WIDTH || height < MIN_CONTENT_HEIGHT) {
    return 5; // Minimal low score
  }

  let score = Math.min(visualArea / 1000, 1000); // Visual area weight (up to 1000 pts)

  const duration = typeof video.duration === 'number' && !isNaN(video.duration) && isFinite(video.duration)
    ? video.duration
    : 0;

  // Penalize videos with duration under 60 seconds (likely ads, previews, or loops)
  if (duration > 0 && duration < MIN_CONTENT_DURATION_SECONDS) {
    score -= 500;
  } else if (duration >= MIN_CONTENT_DURATION_SECONDS) {
    score += 300; // Bonus for valid full-length media duration
  }

  // Bonus for playing video or video that has made progress
  if (!video.paused) {
    score += 400;
  }
  if (video.currentTime > 0) {
    score += 150;
  }

  // Detect muted looping background animations
  const isLooping = video.loop === true;
  const isMuted = video.muted === true;
  if (isLooping && isMuted && duration > 0 && duration < 60) {
    score -= 800;
  }

  return Math.max(score, 0);
}

/**
 * Recursively discovers all video elements including inside open shadow roots.
 */
export function findAllVideos(root: Document | Element = typeof document !== 'undefined' ? document : (null as any)): HTMLVideoElement[] {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  const videos: HTMLVideoElement[] = Array.from(root.querySelectorAll('video'));

  try {
    const allElements = root.querySelectorAll('*');
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      if (el && el.shadowRoot) {
        videos.push(...findAllVideos(el.shadowRoot as any));
      }
    }
  } catch {
    // Non-fatal if DOM traversal throws
  }

  return videos;
}

/**
 * Inspects candidate videos and returns the most prominent primary video element.
 */
export function findPrimaryVideo(root: Document | Element = typeof document !== 'undefined' ? document : (null as any)): HTMLVideoElement | null {
  const videos = findAllVideos(root);
  if (videos.length === 0) return null;

  if (videos.length === 1) {
    const v = videos[0]!;
    // Only discard if explicitly a tiny 0x0 or hidden beacon (< 50px) with no source
    if (typeof v.getBoundingClientRect === 'function') {
      const rect = v.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.width < 50 && rect.height < 50 && !v.src && !v.currentSrc) {
        return null;
      }
    }
    return v;
  }

  let bestVideo: HTMLVideoElement | null = null;
  let highestScore = -1;

  for (const video of videos) {
    const score = calculateVideoScore(video);
    if (score > highestScore && score > 0) {
      highestScore = score;
      bestVideo = video;
    }
  }

  // Fallback: if multiple videos exist but none scored > 0, pick first video with a source or progress
  if (!bestVideo) {
    bestVideo = videos.find((v) => v.src || v.currentSrc || (v.duration && v.duration > 0) || v.currentTime > 0) || videos[0] || null;
  }

  return bestVideo;
}

/**
 * Observes DOM mutations to detect dynamically inserted or replaced video elements in SPAs.
 */
export class PrimaryVideoObserver {
  private observer: MutationObserver | null = null;
  private currentVideo: HTMLVideoElement | null = null;
  private onVideoChanged: (video: HTMLVideoElement | null) => void;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(onVideoChanged: (video: HTMLVideoElement | null) => void) {
    this.onVideoChanged = onVideoChanged;
  }

  public start(targetNode: Node = typeof document !== 'undefined' ? document.body : (null as any)): void {
    if (!targetNode || typeof MutationObserver === 'undefined') return;

    // Initial check
    this.reevaluate();

    this.observer = new MutationObserver(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.reevaluate();
      }, 300);
    });

    this.observer.observe(targetNode, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'style', 'class'],
    });
  }

  public reevaluate(): void {
    const found = findPrimaryVideo();
    if (found !== this.currentVideo) {
      this.currentVideo = found;
      this.onVideoChanged(found);
    }
  }

  public getCurrentVideo(): HTMLVideoElement | null {
    return this.currentVideo;
  }

  public stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.currentVideo = null;
  }
}
