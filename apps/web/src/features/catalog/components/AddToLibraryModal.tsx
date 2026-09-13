'use client';

import React, { useState } from 'react';
import { addToLibraryAction } from '../actions/catalog-actions';
import type { CatalogMedia, InitialLibraryStatus } from '../types/catalog-types';

interface AddToLibraryModalProps {
  media: CatalogMedia;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (entryId: string, status: InitialLibraryStatus) => void;
}

export function AddToLibraryModal({
  media,
  isOpen,
  onClose,
  onSuccess,
}: AddToLibraryModalProps) {
  const [status, setStatus] = useState<InitialLibraryStatus>('watchlist');
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleAdd() {
    setIsPending(true);
    setErrorMessage(null);

    const res = await addToLibraryAction({
      provider: media.provider,
      externalId: media.externalId,
      providerMediaType: media.providerMediaType,
      initialStatus: status,
    });

    setIsPending(false);

    if (res.success) {
      if (onSuccess && res.entryId) {
        onSuccess(res.entryId, status);
      }
      onClose();
    } else {
      setErrorMessage(res.error || res.message || 'Failed to add to library.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-full max-w-md rounded-card border border-app-border bg-app-surface p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-app-border pb-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-primary">
              Add to Library
            </span>
            <h3 id="modal-title" className="mt-1 text-base font-semibold text-app-text line-clamp-1">
              {media.title}
            </h3>
            {media.releaseYear && (
              <p className="text-xs text-app-dim">{media.releaseYear} • {media.category.toUpperCase()}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="text-app-dim hover:text-app-text p-1"
            aria-label="Close dialog"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-btn border border-brand-danger/30 bg-brand-danger/10 p-3 text-xs text-brand-danger">
            {errorMessage}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <label className="block text-xs font-medium text-app-muted">
            Select initial status for this title:
          </label>

          <div className="grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={() => setStatus('watchlist')}
              className={`flex items-center justify-between rounded-btn border p-3.5 text-left transition ${
                status === 'watchlist'
                  ? 'border-brand-primary bg-brand-primary/10 text-app-text'
                  : 'border-app-border bg-app-bg text-app-muted hover:border-app-muted hover:text-app-text'
              }`}
            >
              <div>
                <div className="text-sm font-medium">Watchlist</div>
                <div className="text-xs text-app-dim">Plan to watch later</div>
              </div>
              <div
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                  status === 'watchlist' ? 'border-brand-primary bg-brand-primary' : 'border-app-dim'
                }`}
              >
                {status === 'watchlist' && <div className="h-1.5 w-1.5 rounded-full bg-app-bg" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatus('watching')}
              className={`flex items-center justify-between rounded-btn border p-3.5 text-left transition ${
                status === 'watching'
                  ? 'border-brand-primary bg-brand-primary/10 text-app-text'
                  : 'border-app-border bg-app-bg text-app-muted hover:border-app-muted hover:text-app-text'
              }`}
            >
              <div>
                <div className="text-sm font-medium">Watching</div>
                <div className="text-xs text-app-dim">Currently watching</div>
              </div>
              <div
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                  status === 'watching' ? 'border-brand-primary bg-brand-primary' : 'border-app-dim'
                }`}
              >
                {status === 'watching' && <div className="h-1.5 w-1.5 rounded-full bg-app-bg" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatus('completed')}
              className={`flex items-center justify-between rounded-btn border p-3.5 text-left transition ${
                status === 'completed'
                  ? 'border-brand-primary bg-brand-primary/10 text-app-text'
                  : 'border-app-border bg-app-bg text-app-muted hover:border-app-muted hover:text-app-text'
              }`}
            >
              <div>
                <div className="text-sm font-medium">Completed</div>
                <div className="text-xs text-app-dim">Finished watching</div>
              </div>
              <div
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                  status === 'completed' ? 'border-brand-primary bg-brand-primary' : 'border-app-dim'
                }`}
              >
                {status === 'completed' && <div className="h-1.5 w-1.5 rounded-full bg-app-bg" />}
              </div>
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-app-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="vr-secondary min-h-[40px] px-4 py-2 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            className="vr-primary min-h-[40px] px-5 py-2 text-xs"
          >
            {isPending ? 'Adding...' : 'Save to Library'}
          </button>
        </div>
      </div>
    </div>
  );
}
