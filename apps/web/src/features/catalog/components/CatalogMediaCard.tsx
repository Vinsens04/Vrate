'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { CatalogMedia, InitialLibraryStatus } from '../types/catalog-types';
import { formatProviderScore } from '../utils/catalog-logic';
import { AddToLibraryModal } from './AddToLibraryModal';
import { CatalogPoster } from './CatalogPoster';

interface CatalogMediaCardProps {
  media: CatalogMedia;
  onAdded?: (mediaId: string, status: InitialLibraryStatus) => void;
}

export function CatalogMediaCard({ media: initialMedia, onAdded }: CatalogMediaCardProps) {
  const [media, setMedia] = useState(initialMedia);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync with prop updates
  React.useEffect(() => {
    setMedia(initialMedia);
  }, [initialMedia]);

  const detailUrl =
    media.provider === 'tmdb'
      ? `/dashboard/discover/tmdb/${media.externalId}?type=${media.providerMediaType || (media.mediaType === 'movie' ? 'movie' : 'tv')}`
      : `/dashboard/discover/anilist/${media.externalId}`;

  const ratingLabel = formatProviderScore(media);

  const typeLabel =
    media.category === 'anime'
      ? 'Anime'
      : media.mediaType === 'movie'
      ? 'Movie'
      : 'Series';

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-card border border-app-border bg-app-surface transition duration-200 hover:border-app-muted hover:shadow-lg">
        {/* Poster with Link to Detail */}
        <Link
          href={detailUrl}
          className="relative aspect-2/3 w-full overflow-hidden bg-app-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          aria-label={`View details for ${media.title}`}
        >
          <CatalogPoster
            posterUrl={media.posterUrl}
            title={media.title}
            category={media.category}
            className="h-full w-full"
          />

          {/* Badges Overlay */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
            <span className="rounded-btn bg-app-bg/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-app-text backdrop-blur-xs border border-app-border/40">
              {typeLabel}
            </span>

            <span
              className={`rounded-btn px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-xs border ${
                media.provider === 'anilist'
                  ? 'bg-blue-950/80 text-blue-300 border-blue-800/50'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50'
              }`}
            >
              {media.provider === 'anilist' ? 'AniList' : 'TMDB'}
            </span>
          </div>

          {/* Rating Badge */}
          {media.providerRating !== null && (
            <div className="absolute bottom-2 left-2 pointer-events-none">
              <span className="inline-flex items-center gap-1 rounded-btn bg-app-bg/90 px-2 py-0.5 text-[11px] font-semibold text-brand-warning backdrop-blur-xs border border-app-border/50">
                <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {ratingLabel}
              </span>
            </div>
          )}
        </Link>

        {/* Content & Action */}
        <div className="flex flex-1 flex-col justify-between p-3.5">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-app-dim">
              {media.releaseYear && <span>{media.releaseYear}</span>}
              {media.genres.length > 0 && (
                <>
                  <span>•</span>
                  <span className="truncate">{media.genres.slice(0, 2).join(', ')}</span>
                </>
              )}
            </div>

            <Link
              href={detailUrl}
              className="mt-1 block font-medium text-app-text hover:text-brand-primary transition line-clamp-1 text-sm focus:outline-none focus-visible:underline"
              title={media.title}
            >
              {media.title}
            </Link>

            {media.originalTitle && (
              <p className="line-clamp-1 text-xs text-app-dim" title={media.originalTitle}>
                {media.originalTitle}
              </p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-app-border/60">
            {media.inLibrary ? (
              <Link
                href={media.libraryEntryId ? `/dashboard/library/${media.libraryEntryId}` : '/dashboard/library'}
                className="flex min-h-[34px] w-full items-center justify-center gap-1.5 rounded-btn border border-brand-primary/40 bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-primary transition hover:bg-brand-primary/20"
              >
                <svg className="h-3.5 w-3.5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>In Library</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="vr-secondary min-h-[34px] w-full px-3 py-1 text-xs font-medium hover:border-brand-primary hover:text-brand-primary"
              >
                + Add
              </button>
            )}
          </div>
        </div>
      </div>

      <AddToLibraryModal
        media={media}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(entryId, status) => {
          setMedia((prev) => ({
            ...prev,
            inLibrary: true,
            libraryEntryId: entryId,
            libraryStatus: status,
          }));
          if (onAdded) {
            onAdded(entryId, status);
          }
        }}
      />
    </>
  );
}
