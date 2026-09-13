'use client';

import React, { useState, useTransition } from 'react';
import { LIBRARY_STATUSES, type LibraryStatus } from '@vrate/shared';
import { updateStatusAction } from '../actions/library-actions';
import { formatStatusLabel } from '../utils/library-logic';

interface StatusSelectProps {
  entryId: string;
  currentStatus: LibraryStatus;
}

export function StatusSelect({ entryId, currentStatus }: StatusSelectProps) {
  const [status, setStatus] = useState<LibraryStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as LibraryStatus;
    setStatus(nextStatus);
    setFeedback(null);

    startTransition(async () => {
      const res = await updateStatusAction(entryId, nextStatus);
      if (!res.success) {
        setStatus(currentStatus);
        setFeedback({ text: res.error || 'Failed to update status', isError: true });
      } else {
        setFeedback({ text: res.message || 'Status updated', isError: false });
        setTimeout(() => setFeedback(null), 3000);
      }
    });
  };

  return (
    <div className="space-y-2">
      <label htmlFor="media-status-select" className="vr-label block">
        Watch status
      </label>
      <div className="relative">
        <select
          id="media-status-select"
          value={status}
          onChange={handleChange}
          disabled={isPending}
          className="vr-control w-full appearance-none pr-9 text-sm font-medium"
        >
          {LIBRARY_STATUSES.map(s => (
            <option key={s} value={s} className="bg-app-surface text-app-text">
              {formatStatusLabel(s)}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-app-dim" aria-hidden="true">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {feedback && (
        <p aria-live="polite" className={`text-xs font-medium transition-all ${feedback.isError ? 'text-brand-danger' : 'text-brand-success'}`}>
          {feedback.text}
        </p>
      )}
    </div>
  );
}

