'use client';

import React, { useEffect } from 'react';

export default function LibraryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Library Error:', error);
  }, [error]);

  return (
    <div className="border-y border-app-border py-12 text-center">
      <p className="vr-label text-brand-danger">Error</p>
      <h2 className="mt-3 text-2xl font-semibold text-app-text">Failed to load library.</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-app-muted">
        Could not load your library data. Please try refreshing the page.
      </p>
      <button type="button" onClick={() => reset()} className="vr-primary mt-7">
        Try again
      </button>
    </div>
  );
}

