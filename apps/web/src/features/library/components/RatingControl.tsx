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
        setFeedback({ text: res.error || 'Failed to save rating', isError: true });
      } else {
        setFeedback({ text: res.message || 'Rating saved', isError: false });
        setTimeout(() => setFeedback(null), 3000);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor="media-rating-select" className="vr-label flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>Personal rating</span>
        </label>
        {rating !== null && (
          <button
            type="button"
            onClick={() => handleRatingChange(null)}
            disabled={isPending}
            className="text-xs text-app-dim transition-colors hover:text-brand-danger focus:outline-none focus-visible:underline disabled:opacity-60"
          >
            Clear
          </button>
        )}
      </div>

      <div className="relative">
        <select
          id="media-rating-select"
          value={rating !== null ? rating.toFixed(1) : ''}
          onChange={e => {
            const val = e.target.value === '' ? null : parseFloat(e.target.value);
            handleRatingChange(val);
          }}
          disabled={isPending}
          className="vr-control w-full appearance-none pr-9 text-sm font-medium"
        >
          <option value="" className="bg-app-surface text-app-dim">
            Unrated
          </option>
          {ratingOptions.map(val => (
            <option key={val} value={val.toFixed(1)} className="bg-app-surface text-app-text">
              ★ {val.toFixed(1)} / 10
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

