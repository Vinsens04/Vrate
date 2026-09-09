'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildLibraryUrl } from '../utils/library-logic';

export function LibrarySearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get('q') || '';
      const trimmed = searchTerm.trim();

      if (trimmed !== currentQ) {
        const currentParams = Object.fromEntries(searchParams.entries());
        const newUrl = buildLibraryUrl('/dashboard/library', currentParams, {
          q: trimmed.length > 0 ? trimmed : null,
          page: 1,
        });

        startTransition(() => {
          router.push(newUrl);
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm, router, searchParams]);

  const handleClear = () => {
    setSearchTerm('');
    const currentParams = Object.fromEntries(searchParams.entries());
    const newUrl = buildLibraryUrl('/dashboard/library', currentParams, {
      q: null,
      page: 1,
    });
    startTransition(() => {
      router.push(newUrl);
    });
  };

  return (
    <div className="relative w-full sm:w-80">
      <label htmlFor="library-search-input" className="sr-only">
        Cari dalam koleksi
      </label>
      <input
        id="library-search-input"
        type="search"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="Cari judul"
        maxLength={100}
        className="vr-control w-full pr-10"
      />

      <div className="pointer-events-none absolute inset-y-0 right-9 flex items-center text-[11px] text-app-dim" aria-live="polite">
        {isPending ? '...' : ''}
      </div>

      {searchTerm.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex min-w-10 items-center justify-center text-app-dim hover:text-app-text focus:outline-none"
          aria-label="Hapus pencarian"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

