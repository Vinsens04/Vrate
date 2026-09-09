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
    { value: 'recent', label: 'Terakhir diperbarui' },
    { value: 'last_watched', label: 'Terakhir ditonton' },
    { value: 'added', label: 'Terbaru ditambahkan' },
    { value: 'title', label: 'Judul A-Z' },
    { value: 'rating', label: 'Rating tertinggi' },
    { value: 'year', label: 'Tahun rilis terbaru' },
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
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <label htmlFor="library-sort-select" className="vr-label whitespace-nowrap">
        Urut
      </label>
      <select
        id="library-sort-select"
        value={currentSort}
        onChange={handleSortChange}
        disabled={isPending}
        className="vr-control w-full pr-8 sm:w-56"
      >
        {sortOptions.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-app-surface text-app-text">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

