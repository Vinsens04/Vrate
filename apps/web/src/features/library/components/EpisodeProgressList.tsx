import React from 'react';
import type { EpisodeProgressItem } from '../types/library-types';
import { formatRelativeTime } from '../utils/library-logic';

interface EpisodeProgressListProps {
  items: EpisodeProgressItem[];
}

export function EpisodeProgressList({ items }: EpisodeProgressListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-app-border/70 bg-app-surface/40 p-6 text-center">
        <p className="text-sm font-medium text-app-muted">No episode progress recorded yet.</p>
        <p className="mt-1 text-xs text-app-dim">Episode progress will sync automatically as you stream content via the Vrate extension.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(ep => {
        const seasonLabel = ep.seasonNumber ? `S${ep.seasonNumber} ` : '';
        const epLabel = `EP ${String(ep.episodeNumber).padStart(2, '0')}`;
        const percent = ep.durationSeconds && ep.durationSeconds > 0
          ? Math.min(100, Math.round((ep.progressSeconds / ep.durationSeconds) * 100))
          : ep.isCompleted ? 100 : 0;

        return (
          <div
            key={ep.id}
            className="flex flex-col gap-3 rounded-xl border border-app-border/60 bg-app-surface/50 p-4 transition-colors hover:border-app-border sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-app-elevated px-2 py-0.5 font-mono text-xs font-semibold text-app-text border border-white/5">
                  {seasonLabel}{epLabel}
                </span>
                {ep.isCompleted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-success/15 px-2 py-0.5 text-[10px] font-semibold text-brand-success border border-brand-success/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-success" />
                    Completed
                  </span>
                )}
                {ep.lastSourceName && (
                  <span className="text-xs text-app-dim">via {ep.lastSourceName}</span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-app-dim">
                <span>{percent}% watched</span>
                {ep.lastWatchedAt && (
                  <>
                    <span>•</span>
                    <span>{formatRelativeTime(ep.lastWatchedAt)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full sm:w-44">
              <div className="h-2 w-full overflow-hidden rounded-full bg-app-elevated">
                <div
                  className={`h-full transition-all duration-300 ${
                    ep.isCompleted
                      ? 'bg-brand-success'
                      : 'bg-gradient-to-r from-brand-primary to-orange-400'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

