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
        setFeedback({ text: res.error || 'Gagal mengubah status', isError: true });
      } else {
        setFeedback({ text: res.message || 'Status diperbarui', isError: false });
        setTimeout(() => setFeedback(null), 3000);
      }
    });
  };

  return (
    <div className="space-y-2">
      <label htmlFor="media-status-select" className="vr-label block">
        Status tontonan
      </label>
      <select
        id="media-status-select"
        value={status}
        onChange={handleChange}
        disabled={isPending}
        className="vr-control w-full pr-8"
      >
        {LIBRARY_STATUSES.map(s => (
          <option key={s} value={s} className="bg-app-surface text-app-text">
            {formatStatusLabel(s)}
          </option>
        ))}
      </select>

      {feedback && (
        <p aria-live="polite" className={`text-xs ${feedback.isError ? 'text-brand-danger' : 'text-brand-success'}`}>
          {feedback.text}
        </p>
      )}
    </div>
  );
}

