'use client';

import React from 'react';
import type { CatalogFilterType, CatalogSource } from '../types/catalog-types';

interface CatalogFilterTabsProps {
  currentType: CatalogFilterType;
  currentSource: CatalogSource;
  onTypeChange: (type: CatalogFilterType) => void;
  onSourceChange: (source: CatalogSource) => void;
  isTmdbConfigured: boolean;
}

export function CatalogFilterTabs({
  currentType,
  currentSource,
  onTypeChange,
  onSourceChange,
  isTmdbConfigured,
}: CatalogFilterTabsProps) {
  const typeTabs: { id: CatalogFilterType; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'movie', label: 'Film' },
    { id: 'series', label: 'Serial' },
    { id: 'anime', label: 'Anime' },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-app-border pb-4">
      {/* Type Filter Buttons */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter kategori media">
        {typeTabs.map((tab) => {
          const isActive = currentType === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTypeChange(tab.id)}
              className={`min-h-[36px] rounded-btn px-4 text-xs font-semibold transition ${
                isActive
                  ? 'bg-brand-primary text-app-bg shadow-sm'
                  : 'bg-app-surface text-app-muted hover:bg-app-elevated hover:text-app-text border border-app-border'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Source Selector */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-app-dim">Sumber:</span>
        <div className="flex items-center gap-1 rounded-btn border border-app-border bg-app-surface p-1">
          <button
            type="button"
            onClick={() => onSourceChange('all')}
            className={`rounded-btn px-2.5 py-1 transition ${
              currentSource === 'all'
                ? 'bg-app-elevated text-app-text font-medium'
                : 'text-app-dim hover:text-app-text'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => onSourceChange('tmdb')}
            className={`rounded-btn px-2.5 py-1 transition flex items-center gap-1 ${
              currentSource === 'tmdb'
                ? 'bg-app-elevated text-emerald-400 font-medium'
                : 'text-app-dim hover:text-app-text'
            }`}
            title={!isTmdbConfigured ? 'TMDB API token belum dikonfigurasi' : undefined}
          >
            <span>TMDB</span>
            {!isTmdbConfigured && (
              <span className="h-1.5 w-1.5 rounded-full bg-brand-warning" title="Belum dikonfigurasi" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onSourceChange('anilist')}
            className={`rounded-btn px-2.5 py-1 transition ${
              currentSource === 'anilist'
                ? 'bg-app-elevated text-blue-400 font-medium'
                : 'text-app-dim hover:text-app-text'
            }`}
          >
            AniList
          </button>
        </div>
      </div>
    </div>
  );
}
