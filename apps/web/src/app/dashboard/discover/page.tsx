import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { DiscoverView } from '@/features/catalog/components/DiscoverView';
import { isTmdbConfigured } from '@/features/catalog/providers/tmdb/client';

export const metadata: Metadata = {
  title: 'Discover Media | Vrate',
  description: 'Search movies, TV series, and anime from TMDB and AniList to add to your library.',
};

export default function DiscoverPage() {
  const tmdbReady = isTmdbConfigured();

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 w-48 bg-app-surface rounded animate-pulse" />
          <div className="h-12 max-w-2xl bg-app-surface rounded animate-pulse" />
          <div className="h-10 bg-app-surface rounded animate-pulse" />
        </div>
      }
    >
      <DiscoverView isTmdbConfigured={tmdbReady} />
    </Suspense>
  );
}
