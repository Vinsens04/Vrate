import React from 'react';
import type { WatchSessionItem } from '../types/library-types';
import { formatDate, formatRelativeTime } from '../utils/library-logic';

interface WatchSessionsListProps {
  items: WatchSessionItem[];
}

export function WatchSessionsList({ items }: WatchSessionsListProps) {
  if (items.length === 0) {
    return (
      <div className="border-y border-app-border py-6">
        <p className="text-sm text-app-muted">Belum ada sesi menonton.</p>
        <p className="mt-1 text-xs text-app-dim">Sesi akan dicatat saat menonton melalui browser extension Vrate.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-app-border border-y border-app-border">
      {items.map(ws => {
        const minutes = Math.floor(ws.watchedSeconds / 60);
        const durationStr = minutes > 0 ? `${minutes} menit` : `${ws.watchedSeconds} detik`;

        return (
          <div key={ws.id} className="grid gap-3 py-4 text-sm sm:grid-cols-[1fr_160px] sm:items-center">
            <div>
              <div className="font-medium text-app-text">
                {ws.sourceName} {ws.sourceDomain ? `(${ws.sourceDomain})` : ''}
              </div>
              <div className="mt-1 text-xs text-app-dim">Durasi {durationStr}</div>
            </div>

            <div className="text-xs text-app-dim sm:text-right">
              <div className="text-app-muted">{formatRelativeTime(ws.startedAt)}</div>
              <div>{formatDate(ws.startedAt)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

