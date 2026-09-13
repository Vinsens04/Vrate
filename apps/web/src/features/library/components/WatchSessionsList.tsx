import React from 'react';
import type { WatchSessionItem } from '../types/library-types';
import { formatDate, formatRelativeTime } from '../utils/library-logic';

interface WatchSessionsListProps {
  items: WatchSessionItem[];
}

export function WatchSessionsList({ items }: WatchSessionsListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-app-border/70 bg-app-surface/40 p-6 text-center">
        <p className="text-sm font-medium text-app-muted">No watch sessions recorded yet.</p>
        <p className="mt-1 text-xs text-app-dim">Sessions are tracked automatically via the Vrate browser extension while watching videos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map(ws => {
        const minutes = Math.floor(ws.watchedSeconds / 60);
        const durationStr = minutes > 0 ? `${minutes} min` : `${ws.watchedSeconds} sec`;

        return (
          <div
            key={ws.id}
            className="flex flex-col justify-between gap-3 rounded-xl border border-app-border/60 bg-app-surface/50 p-4 transition-colors hover:border-app-border sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-app-text">{ws.sourceName}</span>
                  {ws.sourceDomain && (
                    <span className="rounded-full bg-app-elevated px-2 py-0.5 text-[10px] font-mono text-app-dim border border-white/5">
                      {ws.sourceDomain}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-app-dim">Duration: <strong className="text-app-muted">{durationStr}</strong></div>
              </div>
            </div>

            <div className="text-xs text-app-dim sm:text-right">
              <div className="font-medium text-app-muted">{formatRelativeTime(ws.startedAt)}</div>
              <div className="text-[11px] text-app-dim">{formatDate(ws.startedAt)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

