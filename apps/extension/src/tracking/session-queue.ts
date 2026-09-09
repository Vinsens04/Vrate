/**
 * ==============================================================================
 * OFFLINE RETRY QUEUE FOR TRACKING CHECKPOINTS (Step 8)
 * ==============================================================================
 * Stores un-synced checkpoints in chrome.storage.local during network drops.
 * Enforces:
 * - Max 100 items capacity
 * - 7-day TTL expiration
 * - Checkpoint collapsing for the same session (merges watched deltas)
 * - Exponential backoff retry scheduling
 * ==============================================================================
 */

import type { CheckpointTrackingRequest } from '@vrate/shared';

export interface QueuedCheckpoint {
  id: string; // Unique queue item ID (UUID)
  request: CheckpointTrackingRequest;
  queuedAt: number; // Wall clock ms
  attempts: number;
  nextAttemptAt: number; // Wall clock ms
  lastError?: string;
}

export const STORAGE_QUEUE_KEY = 'vrate.tracking.queue';
export const MAX_QUEUE_SIZE = 100;
export const MAX_QUEUE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class TrackingQueue {
  private static getStorage(): chrome.storage.StorageArea | null {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return chrome.storage.local;
    }
    return null;
  }

  /**
   * Loads all items from storage, purging expired items.
   */
  public static async getAll(): Promise<QueuedCheckpoint[]> {
    const storage = this.getStorage();
    if (!storage) return [];

    try {
      const data = await storage.get(STORAGE_QUEUE_KEY);
      const raw = data[STORAGE_QUEUE_KEY];
      if (!Array.isArray(raw)) return [];

      const now = Date.now();
      // Filter out items older than 7 days
      const valid = (raw as QueuedCheckpoint[]).filter(
        (item) => now - item.queuedAt < MAX_QUEUE_TTL_MS
      );

      if (valid.length !== raw.length) {
        await storage.set({ [STORAGE_QUEUE_KEY]: valid });
      }

      return valid;
    } catch {
      return [];
    }
  }

  /**
   * Saves items array to storage.
   */
  private static async saveAll(items: QueuedCheckpoint[]): Promise<void> {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      await storage.set({ [STORAGE_QUEUE_KEY]: items });
    } catch {
      // Storage quota or browser shutdown
    }
  }

  /**
   * Enqueues a checkpoint request.
   * If an unattempted/pending checkpoint already exists for the same clientSessionId,
   * merges the watched deltas and updates the progress.
   */
  public static async enqueue(request: CheckpointTrackingRequest): Promise<void> {
    const items = await this.getAll();
    const now = Date.now();

    // Check if an item for the same session is already in the queue
    const existingIndex = items.findIndex(
      (item) => item.request.clientSessionId === request.clientSessionId
    );

    if (existingIndex >= 0) {
      const existing = items[existingIndex]!;
      // Merge deltas (capped to 300s per schema)
      const mergedDelta = Math.min(300, existing.request.watchedDeltaSeconds + request.watchedDeltaSeconds);
      
      items[existingIndex] = {
        ...existing,
        request: {
          ...request,
          watchedDeltaSeconds: mergedDelta,
          // If either was ended, preserve isEnded
          isEnded: existing.request.isEnded || request.isEnded,
        },
        queuedAt: now,
        nextAttemptAt: now, // Ready to retry
      };
    } else {
      // Insert new item, enforcing MAX_QUEUE_SIZE
      if (items.length >= MAX_QUEUE_SIZE) {
        // Evict oldest item
        items.shift();
      }

      const newItem: QueuedCheckpoint = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `queue_${now}_${Math.random()}`,
        request,
        queuedAt: now,
        attempts: 0,
        nextAttemptAt: now,
      };

      items.push(newItem);
    }

    await this.saveAll(items);
  }

  /**
   * Returns items ready for retry (where nextAttemptAt <= now).
   */
  public static async getReadyBatch(limit = 5): Promise<QueuedCheckpoint[]> {
    const items = await this.getAll();
    const now = Date.now();

    return items
      .filter((item) => item.nextAttemptAt <= now)
      .slice(0, limit);
  }

  /**
   * Removes successfully sent items by ID.
   */
  public static async remove(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const items = await this.getAll();
    const set = new Set(ids);
    const filtered = items.filter((item) => !set.has(item.id));
    await this.saveAll(filtered);
  }

  /**
   * Records a failed attempt with exponential backoff.
   */
  public static async recordAttempt(id: string, error?: string): Promise<void> {
    const items = await this.getAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return;

    const item = items[index]!;
    const attempts = item.attempts + 1;
    // Exponential backoff: 2s, 4s, 8s, 16s, 32s, max 60s
    const backoffMs = Math.min(1000 * Math.pow(2, attempts), 60000);

    items[index] = {
      ...item,
      attempts,
      nextAttemptAt: Date.now() + backoffMs,
      lastError: error,
    };

    await this.saveAll(items);
  }

  /**
   * Clears all items in the queue.
   */
  public static async clear(): Promise<void> {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      await storage.remove(STORAGE_QUEUE_KEY);
    } catch {
      // safe
    }
  }

  /**
   * Gets current queue count.
   */
  public static async size(): Promise<number> {
    const items = await this.getAll();
    return items.length;
  }
}
