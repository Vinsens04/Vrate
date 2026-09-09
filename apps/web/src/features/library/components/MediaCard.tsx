import React from 'react';
import Link from 'next/link';
import type { LibraryEntryItem } from '../types/library-types';
import { PosterImage } from './PosterImage';
import { StatusBadge } from './StatusBadge';
import { FavoriteButton } from './FavoriteButton';
import { formatRelativeTime, formatEpisodeBadge } from '../utils/library-logic';

interface MediaCardProps {
  entry: LibraryEntryItem;
}

export function MediaCard({ entry }: MediaCardProps) {
  const { media, status, rating, isFavorite, latestEpisodeProgress, lastWatchedAt, updatedAt } = entry;
  const timeDisplay = lastWatchedAt || updatedAt;
  const episodeBadge = formatEpisodeBadge(media.mediaType, latestEpisodeProgress, media.totalSeasons);

  return (
    <article className="group relative min-w-0">
      <div className="relative">
        <Link href={`/dashboard/library/${entry.id}`} tabIndex={-1} aria-hidden="true">
          <PosterImage
            posterUrl={media.posterUrl}
            title={media.title}
            mediaType={media.mediaType}
            className="w-full"
          />
        </Link>

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
          <StatusBadge status={status} size="sm" className="bg-app-bg/90" />
          <FavoriteButton entryId={entry.id} isFavorite={isFavorite} size="sm" />
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-app-bg/90 to-transparent p-2 pt-10">
          {episodeBadge ? (
            <span className="bg-app-bg/90 px-2 py-1 font-mono text-[11px] font-medium text-app-text">
              {episodeBadge}
            </span>
          ) : (
            <span />
          )}
          {rating !== null && (
            <span className="bg-app-bg/90 px-2 py-1 text-[11px] font-semibold text-app-text">
              {rating.toFixed(1)} / 10
            </span>
          )}
        </div>
      </div>

      <div className="pt-3">
        <div className="flex items-center gap-2 text-[11px] text-app-dim">
          <span>{media.mediaType === 'movie' ? 'Film' : 'Serial'}</span>
          {media.releaseYear && (
            <>
              <span>/</span>
              <span>{media.releaseYear}</span>
            </>
          )}
        </div>

        <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-app-text transition group-hover:text-brand-primary">
          <Link href={`/dashboard/library/${entry.id}`} className="focus:outline-none focus-visible:underline">
            {media.title}
          </Link>
        </h3>

        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-app-dim">
          <span className="truncate">{formatRelativeTime(timeDisplay)}</span>
          <Link
            href={`/dashboard/library/${entry.id}`}
            className="shrink-0 text-app-muted transition hover:text-brand-primary"
            aria-label={`Detail untuk ${media.title}`}
          >
            Detail
          </Link>
        </div>
      </div>
    </article>
  );
}

