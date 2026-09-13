'use client';

import React, { useEffect, useState } from 'react';

interface CatalogSearchInputProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function CatalogSearchInput({
  initialQuery = '',
  onSearch,
  isLoading = false,
}: CatalogSearchInputProps) {
  const [query, setQuery] = useState(initialQuery);

  // Synchronize when initialQuery changes from outside (e.g. browser back/forward)
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Debounced search (350ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === initialQuery.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      onSearch(trimmed);
    }, 350);

    return () => clearTimeout(timer);
  }, [query, onSearch, initialQuery]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(query.trim());
  }

  function handleClear() {
    setQuery('');
    onSearch('');
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="group relative flex items-center">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-app-dim transition-colors group-focus-within:text-app-muted">
          {isLoading ? (
            <svg
              className="h-5 w-5 animate-spin text-brand-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles..."
          maxLength={100}
          className="h-10 w-full rounded-[12px] border border-[#252B36] bg-[#0D1117] py-2 pl-10 pr-10 text-sm text-app-text shadow-sm transition-all duration-200 placeholder:text-[#737C8B] focus:border-brand-primary/70 focus:bg-[#10141C] focus:outline-none focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-not-allowed disabled:opacity-55"
          aria-label="Search media catalog"
        />


        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-2 flex h-full items-center justify-center rounded-md px-2 text-app-dim transition-colors hover:text-app-text focus:outline-none"
            aria-label="Clear search keyword"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {query.length === 1 && (
        <p className="mt-1.5 text-xs text-app-dim">
          Type at least 2 characters to start searching.
        </p>
      )}
    </form>
  );
}
