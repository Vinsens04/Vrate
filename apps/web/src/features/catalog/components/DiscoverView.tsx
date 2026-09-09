'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  CatalogFilterType,
  CatalogSearchResult,
  CatalogSource,
} from '../types/catalog-types';
import {
  buildDiscoverUrl,
  parseCatalogFilter,
  parseCatalogPage,
  parseCatalogSource,
} from '../utils/catalog-logic';
import { CatalogFilterTabs } from './CatalogFilterTabs';
import { CatalogGrid } from './CatalogGrid';
import { CatalogSearchInput } from './CatalogSearchInput';

interface DiscoverViewProps {
  isTmdbConfigured: boolean;
}

export function DiscoverView({ isTmdbConfigured }: DiscoverViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get('q') || '';
  const urlSource = parseCatalogSource(searchParams.get('source'));
  const urlType = parseCatalogFilter(searchParams.get('type'));
  const urlPage = parseCatalogPage(searchParams.get('page'));

  const [searchResult, setSearchResult] = useState<CatalogSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch search results from internal API
  const performSearch = useCallback(
    async (q: string, source: CatalogSource, type: CatalogFilterType, page: number) => {
      if (q.trim().length < 2) {
        setSearchResult(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      // Abort previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: q.trim(),
          source,
          type,
          page: String(page),
        });

        const res = await fetch(`/api/catalog/search?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `Pencarian gagal (status ${res.status})`);
        }

        const data: CatalogSearchResult = await res.json();
        setSearchResult(data);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat mencari.');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Trigger search whenever URL params change
  useEffect(() => {
    performSearch(urlQuery, urlSource, urlType, urlPage);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [urlQuery, urlSource, urlType, urlPage, performSearch]);

  const updateUrl = useCallback(
    (updates: { q?: string; source?: string; type?: string; page?: string | number }) => {
      const nextUrl = buildDiscoverUrl(
        '/dashboard/discover',
        {
          q: urlQuery,
          source: urlSource,
          type: urlType,
          page: urlPage,
        },
        updates
      );
      router.push(nextUrl);
    },
    [router, urlQuery, urlSource, urlType, urlPage]
  );

  const handleSearchQuery = useCallback(
    (newQ: string) => {
      updateUrl({ q: newQ, page: 1 });
    },
    [updateUrl]
  );

  const handleTypeChange = useCallback(
    (newType: CatalogFilterType) => {
      updateUrl({ type: newType, page: 1 });
    },
    [updateUrl]
  );

  const handleSourceChange = useCallback(
    (newSource: CatalogSource) => {
      updateUrl({ source: newSource, page: 1 });
    },
    [updateUrl]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateUrl({ page: newPage });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateUrl]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-editorial text-2xl font-bold tracking-tight text-app-text sm:text-3xl">
          Temukan Media
        </h1>
        <p className="mt-1 text-sm text-app-muted">
          Jelajahi film dan serial dari TMDB serta anime dari AniList untuk ditambahkan ke perpustakaan Anda.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="max-w-2xl">
        <CatalogSearchInput
          initialQuery={urlQuery}
          onSearch={handleSearchQuery}
          isLoading={isLoading}
        />
      </div>

      {/* Filter Tabs & Source Selector */}
      <CatalogFilterTabs
        currentType={urlType}
        currentSource={urlSource}
        onTypeChange={handleTypeChange}
        onSourceChange={handleSourceChange}
        isTmdbConfigured={isTmdbConfigured}
      />

      {/* Main Grid / Status Area */}
      <CatalogGrid
        searchResult={searchResult}
        isLoading={isLoading}
        query={urlQuery}
        error={error}
        onRetry={() => performSearch(urlQuery, urlSource, urlType, urlPage)}
        onSearchSuggestion={(suggestion) => handleSearchQuery(suggestion)}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
