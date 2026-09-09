'use client';

import React, { useState, useTransition } from 'react';
import { updateNotesAction } from '../actions/library-actions';

interface NotesFormProps {
  entryId: string;
  initialNotes: string | null;
}

export function NotesForm({ entryId, initialNotes }: NotesFormProps) {
  const [notes, setNotes] = useState(initialNotes || '');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const charCount = notes.length;
  const isTooLong = charCount > 2000;
  const hasChanged = notes !== (initialNotes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTooLong) return;

    setFeedback(null);
    startTransition(async () => {
      const res = await updateNotesAction(entryId, notes.trim() ? notes : null);
      if (!res.success) {
        setFeedback({ text: res.error || 'Gagal menyimpan catatan.', isError: true });
      } else {
        setFeedback({ text: res.message || 'Catatan disimpan.', isError: false });
        setTimeout(() => setFeedback(null), 3000);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor="library-notes-input" className="vr-label">
          Catatan pribadi
        </label>
        <span className={`font-mono text-[11px] ${isTooLong ? 'font-semibold text-brand-danger' : 'text-app-dim'}`} aria-live="polite">
          {charCount} / 2000
        </span>
      </div>

      <textarea
        id="library-notes-input"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={7}
        maxLength={2100}
        placeholder="Tulis kesan, detail yang ingin diingat, atau alasan ratingmu."
        className={`vr-control w-full resize-y leading-6 ${isTooLong ? 'border-brand-danger focus:border-brand-danger focus:ring-brand-danger/20' : ''}`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5">
          {feedback && (
            <p aria-live="polite" className={`text-xs ${feedback.isError ? 'text-brand-danger' : 'text-brand-success'}`}>
              {feedback.text}
            </p>
          )}
        </div>

        <button type="submit" disabled={isPending || isTooLong || !hasChanged} className="vr-primary min-h-[40px] px-4 py-2 text-xs">
          {isPending ? 'Menyimpan' : 'Simpan catatan'}
        </button>
      </div>
    </form>
  );
}

