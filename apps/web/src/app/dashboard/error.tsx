'use client';

import React, { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div className="border-y border-app-border py-12 text-center">
      <p className="vr-label text-brand-danger">Error</p>
      <h2 className="mt-3 text-2xl font-semibold text-app-text">Dashboard gagal dimuat.</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-app-muted">
        Ringkasan library tidak bisa diambil sekarang. Coba muat ulang halaman ini.
      </p>
      <button type="button" onClick={() => reset()} className="vr-primary mt-7">
        Coba lagi
      </button>
    </div>
  );
}

