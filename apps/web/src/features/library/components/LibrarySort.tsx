'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SortOption } from '../types/library-types';
import { buildLibraryUrl, parseSortOption } from '../utils/library-logic';

export function LibrarySort() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = parseSortOption(searchParams.get('sort'));
  const [isPending, startTransition] = useTransition();

  const sortOptions: Array<{ value: SortOption; label: string }> = [
    { value: 'recent', label: 'Recently updated' },
    { value: 'last_watched', label: 'Last watched' },
    { value: 'added', label: 'Recently added' },
    { value: 'title', label: 'Title (A-Z)' },
    { value: 'rating', label: 'Highest rating' },
    { value: 'year', label: 'Release year (newest)' },
  ];

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSort = e.target.value as SortOption;
    const currentParams = Object.fromEntries(searchParams.entries());
    const newUrl = buildLibraryUrl('/dashboard/library', currentParams, {
      sort: nextSort,
      page: 1,
    });

    startTransition(() => {
      router.push(newUrl);
    });
  };

  return (
    <div className="flex w-full items-center gap-2.5 sm:w-auto">
      <label htmlFor="library-sort-select" className="vr-label whitespace-nowrap">
        Sort
      </label>
      <div className="relative w-full sm:w-52">
        <select
          id="library-sort-select"
          value={currentSort}
          onChange={handleSortChange}
          disabled={isPending}
          className="vr-control w-full appearance-none pr-8 text-xs font-medium sm:text-sm"
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-app-surface text-app-text">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-app-dim" aria-hidden="true">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

