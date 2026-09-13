'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deleteEntryAction } from '../actions/library-actions';

interface DeleteEntryDialogProps {
  entryId: string;
  mediaTitle: string;
}

export function DeleteEntryDialog({ entryId, mediaTitle }: DeleteEntryDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleDelete = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await deleteEntryAction(entryId);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to remove media.');
      } else {
        setIsOpen(false);
        router.push('/dashboard/library');
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-[40px] items-center justify-center rounded-btn border border-brand-danger/40 px-4 py-2 text-xs font-semibold text-brand-danger transition hover:bg-brand-danger/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-danger"
      >
        Remove from library
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="w-full max-w-md border border-app-border bg-app-bg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 id="delete-dialog-title" className="text-xl font-semibold text-app-text">
              Remove from library?
            </h3>
            <div id="delete-dialog-description" className="mt-4 space-y-3 text-sm leading-7 text-app-muted">
              <p>
                Media <span className="font-semibold text-app-text">&quot;{mediaTitle}&quot;</span> will be removed from your collection.
              </p>
              <p className="border-l-2 border-brand-warning pl-3 text-xs leading-6 text-brand-warning">
                Episode progress, personal rating, notes, and related watch history will also be permanently deleted.
              </p>
            </div>

            {errorMessage && (
              <p className="mt-4 text-sm text-brand-danger" role="alert">
                {errorMessage}
              </p>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setIsOpen(false)} disabled={isPending} className="vr-secondary min-h-[40px] px-4 py-2 text-xs">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex min-h-[40px] items-center justify-center rounded-btn bg-brand-danger px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-danger/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-danger disabled:opacity-50"
              >
                {isPending ? 'Removing...' : 'Remove media'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


