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
      <div className="relative flex items-center">
        {/* Search Icon or Loading Spinner */}
        <div className="pointer-events-none absolute left-4 text-app-dim">
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
          placeholder="Cari film, serial TV, atau anime (min. 2 karakter)..."
          maxLength={100}
          className="vr-control w-full pl-11 pr-10 text-base shadow-sm focus:border-brand-primary"
          aria-label="Cari katalog media"
        />

        {/* Clear Button */}
        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-1 text-app-dim hover:text-app-text focus:outline-none"
            aria-label="Hapus kata kunci pencarian"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {query.length === 1 && (
        <p className="mt-1.5 text-xs text-app-dim">
          Ketik minimal 2 karakter untuk memulai pencarian.
        </p>
      )}
    </form>
  );
}
