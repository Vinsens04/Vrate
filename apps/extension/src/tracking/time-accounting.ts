/**
 * ==============================================================================
 * TIME ACCOUNTING FOR VIDEO TRACKING (Step 8)
 * ==============================================================================
 * Accurately accumulates watched playback time using monotonic clock deltas
 * scaled by playbackRate. Defends against:
 * - Forward/backward seeking (never counted as watched time)
 * - NaN, Infinity, negative or extreme duration/timestamps
 * - Playback rate changes and unnatural speeds
 * - Tab throttling / background sleep jumps
 * ==============================================================================
 */

export interface TimeAccountingSnapshot {
  progressSeconds: number;
  durationSeconds: number | null;
  watchedDeltaSeconds: number;
  totalWatchedSeconds: number;
  playbackRate: number;
  isPlaying: boolean;
  isSeeking: boolean;
  isEnded: boolean;
}

export const MIN_PLAYBACK_RATE = 0.25;
export const MAX_PLAYBACK_RATE = 4.0;
export const MAX_SINGLE_TICK_DELTA = 5.0; // Max allowed seconds accounted in a single timeupdate tick

export class TimeAccounting {
  private progressSeconds = 0;
  private durationSeconds: number | null = null;
  private watchedDeltaSeconds = 0;
  private totalWatchedSeconds = 0;
  private playbackRate = 1.0;
  private isPlaying = false;
  private isSeeking = false;
  private isEnded = false;

  private lastVideoTime: number | null = null;
  private lastWallClockMs: number | null = null;

  constructor(initialProgress = 0, initialDuration: number | null = null) {
    this.init(initialProgress, initialDuration);
  }

  public init(initialProgress = 0, initialDuration: number | null = null): void {
    this.progressSeconds = this.sanitizeTime(initialProgress);
    this.durationSeconds = this.sanitizeDuration(initialDuration);
    this.watchedDeltaSeconds = 0;
    this.totalWatchedSeconds = 0;
    this.playbackRate = 1.0;
    this.isPlaying = false;
    this.isSeeking = false;
    this.isEnded = false;
    this.lastVideoTime = this.progressSeconds;
    this.lastWallClockMs = null;
  }

  /**
   * Sanitizes video time (non-negative finite number, capped at 24 hours).
   */
  private sanitizeTime(t: unknown): number {
    if (typeof t !== 'number' || isNaN(t) || !isFinite(t) || t < 0) {
      return 0;
    }
    return Math.min(Math.round(t * 100) / 100, 86400);
  }

  /**
   * Sanitizes video duration (positive finite number or null).
   */
  private sanitizeDuration(d: unknown): number | null {
    if (typeof d !== 'number' || isNaN(d) || !isFinite(d) || d <= 0) {
      return null;
    }
    return Math.min(Math.round(d * 100) / 100, 86400);
  }

  /**
   * Sanitizes playback rate within reasonable bounds [0.25, 4.0].
   */
  private sanitizeRate(r: unknown): number {
    if (typeof r !== 'number' || isNaN(r) || !isFinite(r)) {
      return 1.0;
    }
    if (r < MIN_PLAYBACK_RATE || r > MAX_PLAYBACK_RATE) {
      return 1.0;
    }
    return Math.round(r * 100) / 100;
  }

  public onPlay(videoTime: number, wallClockMs: number = Date.now()): void {
    const cleanTime = this.sanitizeTime(videoTime);
    this.isPlaying = true;
    this.isEnded = false;
    this.progressSeconds = cleanTime;
    this.lastVideoTime = cleanTime;
    this.lastWallClockMs = wallClockMs;
  }

  public onPlaying(videoTime: number, wallClockMs: number = Date.now()): void {
    const cleanTime = this.sanitizeTime(videoTime);
    this.isPlaying = true;
    this.isSeeking = false;
    this.isEnded = false;
    this.progressSeconds = cleanTime;
    this.lastVideoTime = cleanTime;
    this.lastWallClockMs = wallClockMs;
  }

  public onPause(videoTime: number, wallClockMs: number = Date.now()): void {
    this.accumulateDelta(videoTime, wallClockMs);
    this.isPlaying = false;
    this.lastWallClockMs = null;
  }

  public onSeeking(videoTime: number): void {
    const cleanTime = this.sanitizeTime(videoTime);
    // Seeking immediately stops watched accumulation until seeked/playing
    this.isSeeking = true;
    this.progressSeconds = cleanTime;
    this.lastVideoTime = cleanTime;
    this.lastWallClockMs = null;
  }

  public onSeeked(videoTime: number, wallClockMs: number = Date.now()): void {
    const cleanTime = this.sanitizeTime(videoTime);
    this.isSeeking = false;
    this.progressSeconds = cleanTime;
    this.lastVideoTime = cleanTime;
    // Do NOT accumulate any watched delta during seek transition
    this.lastWallClockMs = this.isPlaying ? wallClockMs : null;
  }

  public onRateChange(rate: number): void {
    this.playbackRate = this.sanitizeRate(rate);
  }

  public onDurationChange(duration: number): void {
    this.durationSeconds = this.sanitizeDuration(duration);
  }

  public onEnded(videoTime: number, wallClockMs: number = Date.now()): void {
    this.accumulateDelta(videoTime, wallClockMs);
    this.isPlaying = false;
    this.isEnded = true;
    this.lastWallClockMs = null;
    if (this.durationSeconds !== null && this.durationSeconds > 0) {
      this.progressSeconds = this.durationSeconds;
    }
  }

  public onTimeUpdate(videoTime: number, duration?: number, wallClockMs: number = Date.now()): void {
    if (duration !== undefined) {
      const cleanDur = this.sanitizeDuration(duration);
      if (cleanDur !== null) {
        this.durationSeconds = cleanDur;
      }
    }
    this.accumulateDelta(videoTime, wallClockMs);
  }

  /**
   * Defensive accumulation of watched delta:
   * Only accumulates if video was playing and not seeking.
   * Compares both video time delta and wall clock delta to prevent jump spoofing.
   */
  private accumulateDelta(videoTime: number, wallClockMs: number): void {
    const cleanTime = this.sanitizeTime(videoTime);
    this.progressSeconds = cleanTime;

    if (!this.isPlaying || this.isSeeking || this.lastVideoTime === null || this.lastWallClockMs === null) {
      this.lastVideoTime = cleanTime;
      if (this.isPlaying && !this.isSeeking) {
        this.lastWallClockMs = wallClockMs;
      } else {
        this.lastWallClockMs = null;
      }
      return;
    }

    const videoDelta = cleanTime - this.lastVideoTime;
    const wallClockDeltaSeconds = Math.max(0, (wallClockMs - this.lastWallClockMs) / 1000);

    // If video moved backwards or didn't advance, no watched delta
    if (videoDelta <= 0) {
      this.lastVideoTime = cleanTime;
      this.lastWallClockMs = wallClockMs;
      return;
    }

    // Expected progress based on wall clock and playbackRate
    const expectedProgress = wallClockDeltaSeconds * this.playbackRate;

    // If video jumped forward substantially more than wall clock time allowed (+1.0s grace for frame skip/sync),
    // it was a forward seek or skip without a discrete seeking event.
    // Cap accounted watched delta to the realistic wall clock progress.
    let accountedDelta = Math.min(videoDelta, expectedProgress + 1.0);

    // Also clamp single tick delta to prevent background freeze catch-up bursts
    accountedDelta = Math.min(accountedDelta, MAX_SINGLE_TICK_DELTA);

    if (accountedDelta > 0 && isFinite(accountedDelta)) {
      this.watchedDeltaSeconds += accountedDelta;
      this.totalWatchedSeconds += accountedDelta;
    }

    this.lastVideoTime = cleanTime;
    this.lastWallClockMs = wallClockMs;
  }

  /**
   * Flushes and returns the accumulated watched delta since last checkpoint.
   * Resets watchedDeltaSeconds to 0.
   */
  public flushWatchedDelta(): number {
    const delta = Math.round(this.watchedDeltaSeconds * 100) / 100;
    this.watchedDeltaSeconds = 0;
    // Bound to schema maximum [0, 300]
    return Math.min(Math.max(0, delta), 300);
  }

  public getSnapshot(): TimeAccountingSnapshot {
    return {
      progressSeconds: Math.round(this.progressSeconds * 100) / 100,
      durationSeconds: this.durationSeconds !== null ? Math.round(this.durationSeconds * 100) / 100 : null,
      watchedDeltaSeconds: Math.round(this.watchedDeltaSeconds * 100) / 100,
      totalWatchedSeconds: Math.round(this.totalWatchedSeconds * 100) / 100,
      playbackRate: this.playbackRate,
      isPlaying: this.isPlaying,
      isSeeking: this.isSeeking,
      isEnded: this.isEnded,
    };
  }
}
