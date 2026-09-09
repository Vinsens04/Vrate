import React from 'react';
import type { EpisodeProgressItem } from '../types/library-types';
import { formatRelativeTime } from '../utils/library-logic';

interface EpisodeProgressListProps {
  items: EpisodeProgressItem[];
}

export function EpisodeProgressList({ items }: EpisodeProgressListProps) {
  if (items.length === 0) {
    return (
      <div className="border-y border-app-border py-6">
        <p className="text-sm text-app-muted">Belum ada progres episode.</p>
        <p className="mt-1 text-xs text-app-dim">Progres per episode akan tercatat saat integrasi streaming tracker aktif.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-app-border border-y border-app-border">
      {items.map(ep => {
        const seasonLabel = ep.seasonNumber ? `Musim ${ep.seasonNumber} / ` : '';
        const epLabel = `Episode ${ep.episodeNumber}`;
        const percent = ep.durationSeconds && ep.durationSeconds > 0
          ? Math.min(100, Math.round((ep.progressSeconds / ep.durationSeconds) * 100))
          : ep.isCompleted ? 100 : 0;

        return (
          <div key={ep.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_160px] sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-app-text">{seasonLabel}{epLabel}</span>
                {ep.lastSourceName && <span className="text-xs text-app-dim">via {ep.lastSourceName}</span>}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-app-dim">
                <span>{percent}% selesai</span>
                {ep.lastWatchedAt && (
                  <>
                    <span>/</span>
                    <span>{formatRelativeTime(ep.lastWatchedAt)}</span>
                  </>
                )}
              </div>
            </div>

            <div className="h-1.5 w-full bg-app-border">
              <div className={`h-full transition-all duration-300 ${ep.isCompleted ? 'bg-brand-success' : 'bg-brand-primary'}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

