'use client';

import React from 'react';
import type {
  CatalogMedia,
  CatalogSearchResult,
  InitialLibraryStatus,
} from '../types/catalog-types';
import { CatalogMediaCard } from './CatalogMediaCard';
import { TmdbNotConfiguredBanner } from './TmdbNotConfiguredBanner';

interface CatalogGridProps {
  searchResult: CatalogSearchResult | null;
  isLoading: boolean;
  query: string;
  error?: string | null;
  onRetry?: () => void;
  onSearchSuggestion?: (suggestion: string) => void;
  onPageChange?: (page: number) => void;
}

export function CatalogGrid({
  searchResult,
  isLoading,
  query,
  error,
  onRetry,
  onSearchSuggestion,
  onPageChange,
}: CatalogGridProps) {
  const suggestions = ['Interstellar', 'Breaking Bad', 'KonoSuba', 'Frieren', 'Dune'];

  // 1. Initial Empty State (no search performed yet)
  if (!query && !isLoading && !searchResult) {
    return (
      <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-app-border bg-app-surface/50 py-16 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-elevated text-brand-primary mb-4 border border-app-border">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="font-editorial text-xl font-medium text-app-text">
          Temukan Film, Serial, dan Anime
        </h3>
        <p className="mt-2 max-w-md text-sm text-app-muted">
          Cari jutaan judul melalui integrasi TMDB dan AniList. Tambahkan ke watchlist atau tandai yang sedang kamu tonton.
        </p>

        {/* Suggestion Chips */}
        {onSearchSuggestion && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-app-dim">Coba cari:</span>
            {suggestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onSearchSuggestion(item)}
                className="rounded-btn border border-app-border bg-app-surface px-3 py-1 text-xs text-app-text transition hover:border-brand-primary hover:text-brand-primary"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. Query too short
  if (query.length > 0 && query.length < 2 && !isLoading) {
    return (
      <div className="rounded-card border border-app-border bg-app-surface/40 p-10 text-center text-app-dim">
        Ketik minimal 2 karakter untuk memulai pencarian.
      </div>
    );
  }

  // 3. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-card border border-app-border bg-app-surface animate-pulse"
            >
              <div className="aspect-2/3 w-full bg-app-secondary/80" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-1/3 bg-app-border rounded" />
                <div className="h-4 w-4/5 bg-app-border rounded" />
                <div className="h-3 w-1/2 bg-app-border rounded" />
                <div className="pt-2">
                  <div className="h-8 w-full bg-app-border rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. Complete System Error
  if (error) {
    return (
      <div className="rounded-card border border-brand-danger/30 bg-brand-danger/10 p-6 text-center">
        <p className="text-sm font-medium text-brand-danger">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="vr-secondary mt-4 min-h-[36px] px-4 py-1.5 text-xs text-brand-danger border-brand-danger/40 hover:bg-brand-danger/20"
          >
            Coba Lagi
          </button>
        )}
      </div>
    );
  }

  if (!searchResult) return null;

  const { results, providers, page } = searchResult;
  const tmdb = providers.tmdb;
  const anilist = providers.anilist;

  // Partial provider errors
  const hasPartialError =
    (tmdb.configured && !tmdb.available && tmdb.error) ||
    (!anilist.available && anilist.error);

  const hasNextPage = tmdb.hasNextPage || anilist.hasNextPage;

  return (
    <div className="space-y-6">
      {/* TMDB unconfigured banner */}
      {!tmdb.configured && <TmdbNotConfiguredBanner />}

      {/* Partial Provider Warning */}
      {hasPartialError && (
        <div className="rounded-card border border-brand-warning/30 bg-brand-warning/10 p-3 text-xs text-brand-warning">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-brand-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              {tmdb.error ? `TMDB: ${tmdb.error} ` : ''}
              {anilist.error ? `AniList: ${anilist.error}` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Results or Empty Results */}
      {results.length === 0 ? (
        <div className="rounded-card border border-app-border bg-app-surface/50 py-16 px-4 text-center">
          <h4 className="text-base font-medium text-app-text">Tidak ada hasil ditemukan</h4>
          <p className="mt-1 text-xs text-app-dim">
            Tidak ditemukan film, serial, atau anime dengan kata kunci &ldquo;{query}&rdquo;.
          </p>
          <p className="mt-3 text-xs text-app-muted">
            Coba periksa ejaan judul atau gunakan kata kunci yang lebih umum.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-app-dim">
            <span>
              Ditemukan <span className="font-semibold text-app-text">{results.length}</span> hasil
              {page > 1 && ` (Halaman ${page})`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {results.map((item) => (
              <CatalogMediaCard
                key={`${item.provider}:${item.externalId}`}
                media={item}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-center gap-3 pt-6 border-t border-app-border">
            {page > 1 && onPageChange && (
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                className="vr-secondary min-h-[38px] px-4 py-2 text-xs"
              >
                ← Sebelumnya
              </button>
            )}
            <span className="text-xs text-app-dim">
              Halaman {page}
            </span>
            {hasNextPage && onPageChange && (
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                className="vr-primary min-h-[38px] px-5 py-2 text-xs"
              >
                Selanjutnya →
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
