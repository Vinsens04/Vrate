/**
 * ==============================================================================
 * PLAYER TRACKER (Step 8)
 * ==============================================================================
 * Binds to an HTML5 Video Element, coordinates time accounting, applies 15-second
 * throttling for regular checkpoints, triggers immediate checkpoints on state
 * transitions (pause, seeked, ended, pagehide), and detects cross-origin iframes.
 * ==============================================================================
 */

import { TimeAccounting, type TimeAccountingSnapshot } from './time-accounting.ts';
import { findPrimaryVideo, PrimaryVideoObserver } from './player-selector.ts';
import type { TrackingEventType, TrackingStatus } from '@vrate/shared';

export interface TrackingCheckpointPayload {
  generation?: number;
  progressSeconds: number;
  durationSeconds: number | null;
  watchedDeltaSeconds: number;
  playbackRate: number;
  eventType: TrackingEventType;
  isEnded: boolean;
  wallClockIso: string;
}

export interface PlayerTrackerCallbacks {
  onCheckpoint: (payload: TrackingCheckpointPayload) => void;
  onPositionUpdate?: (progressSeconds: number, durationSeconds: number | null, generation?: number) => void;
  onStatusChange: (status: TrackingStatus, details?: { iframeDomain?: string; error?: string }, generation?: number) => void;
}

export const CHECKPOINT_INTERVAL_MS = 15000; // 15 seconds regular checkpoint

export class PlayerTracker {
  private video: HTMLVideoElement | null = null;
  private timeAccounting: TimeAccounting;
  private callbacks: PlayerTrackerCallbacks;
  private videoObserver: PrimaryVideoObserver | null = null;
  private generation = 0;

  private lastCheckpointWallClockMs = 0;
  private checkpointTimer: ReturnType<typeof setInterval> | null = null;
  private isTracking = false;
  private boundListeners: Array<{ target: EventTarget; type: string; listener: EventListenerOrEventListenerObject }> = [];

  constructor(callbacks: PlayerTrackerCallbacks, initialProgress = 0, initialDuration: number | null = null) {
    this.callbacks = callbacks;
    this.timeAccounting = new TimeAccounting(initialProgress, initialDuration);
  }

  /**
   * Starts tracking: searches for primary video, starts DOM observer for dynamic videos,
   * binds listeners, and initiates periodic checkpoints.
   */
  public start(
    initialProgress = 0,
    initialDuration: number | null = null,
    generation = 0
  ): { status: TrackingStatus; details?: { iframeDomain?: string; error?: string } } {
    this.stop();
    this.isTracking = true;
    this.generation = generation;
    this.timeAccounting.init(initialProgress, initialDuration);
    this.lastCheckpointWallClockMs = Date.now();

    let initialStatus: TrackingStatus = 'waiting_video';
    let details: { iframeDomain?: string; error?: string } | undefined;

    // 1. Initial lookup
    const foundVideo = findPrimaryVideo();
    if (foundVideo) {
      this.attachToVideo(foundVideo);
      initialStatus = foundVideo.paused ? 'paused' : 'tracking';
      this.callbacks.onStatusChange(initialStatus, undefined, this.generation);
    } else {
      const iframeDomain = this.checkForInaccessibleIframes();
      if (iframeDomain) {
        initialStatus = 'unsupported_iframe';
        details = { iframeDomain };
        this.callbacks.onStatusChange(initialStatus, details, this.generation);
      } else {
        initialStatus = 'waiting_video';
        this.callbacks.onStatusChange(initialStatus, undefined, this.generation);
      }
    }

    // 2. Start DOM observer for dynamically mounted / swapped video players
    this.videoObserver = new PrimaryVideoObserver((newVideo) => {
      if (!this.isTracking) return;
      if (newVideo !== this.video) {
        if (newVideo) {
          this.attachToVideo(newVideo);
          this.callbacks.onStatusChange(newVideo.paused ? 'paused' : 'tracking', undefined, this.generation);
        } else {
          this.detachFromVideo();
          const iframeDomain = this.checkForInaccessibleIframes();
          if (iframeDomain) {
            this.callbacks.onStatusChange('unsupported_iframe', { iframeDomain }, this.generation);
          } else {
            this.callbacks.onStatusChange('waiting_video', undefined, this.generation);
          }
        }
      }
    });
    this.videoObserver.start();

    // 3. Periodic checkpoint interval timer
    this.checkpointTimer = setInterval(() => {
      this.checkPeriodicCheckpoint();
    }, 3000); // Poll every 3 seconds, fire checkpoint when >= 15 seconds elapsed

    return { status: initialStatus, details };
  }

  private addListener(target: EventTarget, type: string, listener: EventListenerOrEventListenerObject): void {
    target.addEventListener(type, listener);
    this.boundListeners.push({ target, type, listener });
  }

  private attachToVideo(video: HTMLVideoElement): void {
    this.detachFromVideo();
    this.video = video;

    if (typeof video.duration === 'number' && !isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
      this.timeAccounting.onDurationChange(video.duration);
    }

    let lastPositionUpdateMs = 0;
    const emitPosition = (force = false) => {
      const now = Date.now();
      if (force || now - lastPositionUpdateMs >= 1000) {
        lastPositionUpdateMs = now;
        const snap = this.timeAccounting.getSnapshot();
        this.callbacks.onPositionUpdate?.(snap.progressSeconds, snap.durationSeconds, this.generation);
      }
    };

    const onPlay = () => {
      this.timeAccounting.onPlay(video.currentTime);
      emitPosition(true);
      this.callbacks.onStatusChange('tracking', undefined, this.generation);
    };

    const onPlaying = () => {
      this.timeAccounting.onPlaying(video.currentTime);
      emitPosition(true);
      this.callbacks.onStatusChange('tracking', undefined, this.generation);
    };

    const onPause = () => {
      this.timeAccounting.onPause(video.currentTime);
      emitPosition(true);
      this.triggerImmediateCheckpoint('pause');
      this.callbacks.onStatusChange('paused', undefined, this.generation);
    };

    const onSeeking = () => {
      this.timeAccounting.onSeeking(video.currentTime);
    };

    const onSeeked = () => {
      this.timeAccounting.onSeeked(video.currentTime);
      emitPosition(true);
      this.triggerImmediateCheckpoint('seeked');
    };

    const onRateChange = () => {
      this.timeAccounting.onRateChange(video.playbackRate);
    };

    const onDurationChange = () => {
      this.timeAccounting.onDurationChange(video.duration);
      emitPosition(true);
    };

    const onTimeUpdate = () => {
      this.timeAccounting.onTimeUpdate(video.currentTime, video.duration);
      emitPosition(false);
    };

    const onEnded = () => {
      this.timeAccounting.onEnded(video.currentTime);
      emitPosition(true);
      this.triggerImmediateCheckpoint('ended');
      this.callbacks.onStatusChange('synced', undefined, this.generation);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        this.triggerImmediateCheckpoint('visibilitychange');
      }
    };

    const onPageHide = () => {
      this.triggerImmediateCheckpoint('pagehide');
    };

    this.addListener(video, 'play', onPlay);
    this.addListener(video, 'playing', onPlaying);
    this.addListener(video, 'pause', onPause);
    this.addListener(video, 'seeking', onSeeking);
    this.addListener(video, 'seeked', onSeeked);
    this.addListener(video, 'ratechange', onRateChange);
    this.addListener(video, 'durationchange', onDurationChange);
    this.addListener(video, 'timeupdate', onTimeUpdate);
    this.addListener(video, 'ended', onEnded);

    if (typeof document !== 'undefined') {
      this.addListener(document, 'visibilitychange', onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      this.addListener(window, 'pagehide', onPageHide);
      this.addListener(window, 'beforeunload', onPageHide);
    }

    // Sync initial state if already playing
    if (!video.paused && !video.ended) {
      this.timeAccounting.onPlaying(video.currentTime);
    } else {
      this.timeAccounting.onTimeUpdate(video.currentTime, video.duration);
    }
    emitPosition(true);
  }

  private detachFromVideo(): void {
    for (const { target, type, listener } of this.boundListeners) {
      try {
        target.removeEventListener(type, listener);
      } catch {
        // Safe disposal
      }
    }
    this.boundListeners = [];
    this.video = null;
  }

  /**
   * Check if 15 seconds have elapsed since last checkpoint while playing.
   */
  private checkPeriodicCheckpoint(): void {
    if (!this.isTracking || !this.video) return;

    const snapshot = this.timeAccounting.getSnapshot();
    if (!snapshot.isPlaying) return;

    const now = Date.now();
    if (now - this.lastCheckpointWallClockMs >= CHECKPOINT_INTERVAL_MS) {
      this.triggerImmediateCheckpoint('checkpoint');
    }
  }

  /**
   * Triggers an immediate checkpoint and flushes watched delta.
   */
  public triggerImmediateCheckpoint(eventType: TrackingEventType): void {
    const snapshot = this.timeAccounting.getSnapshot();
    const watchedDelta = this.timeAccounting.flushWatchedDelta();
    this.lastCheckpointWallClockMs = Date.now();

    const payload: TrackingCheckpointPayload = {
      generation: this.generation,
      progressSeconds: snapshot.progressSeconds,
      durationSeconds: snapshot.durationSeconds,
      watchedDeltaSeconds: watchedDelta,
      playbackRate: snapshot.playbackRate,
      eventType,
      isEnded: snapshot.isEnded || eventType === 'ended',
      wallClockIso: new Date().toISOString(),
    };

    this.callbacks.onCheckpoint(payload);
  }

  /**
   * Detects whether an inaccessible cross-origin iframe exists on the page.
   * Does NOT scrape or bypass Same-Origin Policy.
   */
  private checkForInaccessibleIframes(): string | null {
    if (typeof document === 'undefined') return null;

    const iframes = Array.from(document.querySelectorAll('iframe'));
    for (const iframe of iframes) {
      try {
        // If contentDocument is inaccessible, browser throws a DOMException (SecurityError)
        const doc = iframe.contentDocument;
        if (!doc) {
          const domain = this.extractDomain(iframe.src);
          if (domain) return domain;
        }
      } catch {
        const domain = this.extractDomain(iframe.src);
        return domain || 'cross-origin-embed';
      }
    }
    return null;
  }

  private extractDomain(urlStr: string): string | null {
    try {
      if (!urlStr || urlStr === 'about:blank') return null;
      return new URL(urlStr).hostname;
    } catch {
      return null;
    }
  }

  public getSnapshot(): TimeAccountingSnapshot {
    return this.timeAccounting.getSnapshot();
  }

  public stop(): void {
    if (this.isTracking) {
      this.triggerImmediateCheckpoint('stop');
    }
    this.isTracking = false;

    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
      this.checkpointTimer = null;
    }
    if (this.videoObserver) {
      this.videoObserver.stop();
      this.videoObserver = null;
    }
    this.detachFromVideo();
  }
}
