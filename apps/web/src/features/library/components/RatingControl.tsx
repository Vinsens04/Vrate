'use client';

import React, { useState, useTransition } from 'react';
import { updateRatingAction } from '../actions/library-actions';

interface RatingControlProps {
  entryId: string;
  currentRating: number | null;
}

export function RatingControl({ entryId, currentRating }: RatingControlProps) {
  const [rating, setRating] = useState<number | null>(currentRating);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const ratingOptions: number[] = [];
  for (let i = 100; i >= 0; i -= 5) {
    ratingOptions.push(i / 10);
  }

  const handleRatingChange = (val: number | null) => {
    setRating(val);
    setFeedback(null);

    startTransition(async () => {
      const res = await updateRatingAction(entryId, val);
      if (!res.success) {
        setRating(currentRating);
        setFeedback({ text: res.error || 'Gagal menyimpan rating', isError: true });
      } else {
        setFeedback({ text: res.message || 'Rating disimpan', isError: false });
        setTimeout(() => setFeedback(null), 3000);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor="media-rating-select" className="vr-label">
          Rating pribadi
        </label>
        {rating !== null && (
          <button
            type="button"
            onClick={() => handleRatingChange(null)}
            disabled={isPending}
            className="text-xs text-app-dim transition hover:text-brand-danger focus:outline-none focus-visible:underline disabled:opacity-60"
          >
            Hapus
          </button>
        )}
      </div>

      <select
        id="media-rating-select"
        value={rating !== null ? rating.toFixed(1) : ''}
        onChange={e => {
          const val = e.target.value === '' ? null : parseFloat(e.target.value);
          handleRatingChange(val);
        }}
        disabled={isPending}
        className="vr-control w-full pr-8"
      >
        <option value="" className="bg-app-surface text-app-dim">
          Belum dinilai
        </option>
        {ratingOptions.map(val => (
          <option key={val} value={val.toFixed(1)} className="bg-app-surface text-app-text">
            {val.toFixed(1)} / 10
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

