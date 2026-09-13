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
    <div className="group relative w-full sm:w-80">
      <label htmlFor="library-search-input" className="sr-only">
        Search within collection
      </label>

      <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-app-dim transition-colors group-focus-within:text-app-muted" aria-hidden="true">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <input
        id="library-search-input"
        type="search"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="Search titles..."
        maxLength={100}
        className="h-10 w-full rounded-[12px] border border-[#252B36] bg-[#0D1117] py-2 pl-10 pr-10 text-sm text-app-text shadow-sm transition-all duration-200 placeholder:text-[#737C8B] focus:border-brand-primary/70 focus:bg-[#10141C] focus:outline-none focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-not-allowed disabled:opacity-55"
      />


      {searchTerm.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-2 flex h-full items-center justify-center rounded-md px-2 text-app-dim transition-colors hover:text-app-text focus:outline-none"
          aria-label="Clear search"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

