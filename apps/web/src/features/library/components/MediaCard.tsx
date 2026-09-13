import React from 'react';
import Link from 'next/link';
import type { LibraryEntryItem } from '../types/library-types';
import { PosterImage } from './PosterImage';
import { StatusBadge } from './StatusBadge';
import { FavoriteButton } from './FavoriteButton';
import { formatRelativeTime, formatEpisodeBadge } from '../utils/library-logic';

interface MediaCardProps {
  entry: LibraryEntryItem;
  variant?: 'default' | 'continueWatching';
}

export function MediaCard({ entry, variant = 'default' }: MediaCardProps) {
  const { media, status, rating, isFavorite, latestEpisodeProgress, lastWatchedAt, updatedAt } = entry;
  const timeDisplay = lastWatchedAt || updatedAt;
  const isContinueWatching = variant === 'continueWatching';

  // Format episode badge (e.g. EP 04 or S2E4)
  const episodeNumber = latestEpisodeProgress?.episodeNumber;
  const seasonNumber = latestEpisodeProgress?.seasonNumber;
  let customEpisodeBadge: string | null = null;

  if (episodeNumber) {
    const formattedEp = String(episodeNumber).padStart(2, '0');
    if (seasonNumber && seasonNumber > 1) {
      customEpisodeBadge = `S${seasonNumber} · EP ${formattedEp}`;
    } else {
      customEpisodeBadge = `EP ${formattedEp}`;
    }
  }

  const episodeBadge = customEpisodeBadge || formatEpisodeBadge(media.mediaType, latestEpisodeProgress, media.totalSeasons);

  // Calculate progress percentage
  let progressPercent = 0;
  if (latestEpisodeProgress?.progressPercent !== null && latestEpisodeProgress?.progressPercent !== undefined) {
    progressPercent = Math.min(100, Math.round(latestEpisodeProgress.progressPercent));
  } else if (
    latestEpisodeProgress?.durationSeconds &&
    latestEpisodeProgress.durationSeconds > 0 &&
    latestEpisodeProgress.progressSeconds
  ) {
    progressPercent = Math.min(100, Math.round((latestEpisodeProgress.progressSeconds / latestEpisodeProgress.durationSeconds) * 100));
  }

  return (
    <article className="group relative flex flex-col transition-all duration-200">
      <div className="relative overflow-hidden rounded-xl bg-app-surface shadow-card transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/15 group-hover:shadow-glow-subtle">
        <Link href={`/dashboard/library/${entry.id}`} tabIndex={-1} aria-hidden="true" className="block">
          <PosterImage
            posterUrl={media.posterUrl}
            title={media.title}
            mediaType={media.mediaType}
            className="w-full"
          />
        </Link>

        {/* Top Floating Badges */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          <div className="pointer-events-auto">
            <StatusBadge status={status} size="sm" />
          </div>
          <div className="pointer-events-auto">
            <FavoriteButton entryId={entry.id} isFavorite={isFavorite} size="sm" />
          </div>
        </div>

        {/* Subtle Play Overlay on Hover */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-white shadow-glow transition-transform duration-200 group-hover:scale-105">
            <svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>

        {/* Bottom Floating Badges with gradient vignette */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-1.5 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-2.5 pt-10">
          {episodeBadge ? (
            <span className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/75 px-2 py-0.5 font-mono text-[10px] font-semibold text-white/95 backdrop-blur-md shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
              {episodeBadge}
            </span>
          ) : (
            <span />
          )}

          {isContinueWatching && progressPercent > 0 ? (
            <span className="pointer-events-auto inline-flex items-center rounded-full border border-white/15 bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white/80 backdrop-blur-md shadow-sm">
              {progressPercent}%
            </span>
          ) : rating !== null ? (
            <span className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur-md shadow-sm">
              <svg className="h-2.5 w-2.5 fill-amber-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{rating.toFixed(1)}</span>
            </span>
          ) : null}
        </div>

        {/* Thin Sleek Progress Bar (Continue Watching variant) */}
        {isContinueWatching && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-primary to-orange-400 transition-all duration-300"
              style={{ width: `${Math.max(progressPercent > 0 ? progressPercent : 15, 6)}%` }}
            />
          </div>
        )}
      </div>

      {/* Metadata Below Poster */}
      <div className="flex flex-1 flex-col justify-between pt-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-dim">
            <span>{media.mediaType === 'movie' ? 'Movie' : 'Series'}</span>
            {media.releaseYear && (
              <>
                <span>•</span>
                <span>{media.releaseYear}</span>
              </>
            )}
          </div>

          <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs font-semibold leading-snug text-app-text transition-colors duration-150 group-hover:text-brand-primary sm:text-sm">
            <Link href={`/dashboard/library/${entry.id}`} className="focus:outline-none focus-visible:underline">
              {media.title}
            </Link>
          </h3>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-app-border/40 pt-2 text-[11px] text-app-dim">
          <span className="truncate">{formatRelativeTime(timeDisplay)}</span>
          <Link
            href={`/dashboard/library/${entry.id}`}
            className={`shrink-0 font-medium transition-colors ${
              isContinueWatching
                ? 'inline-flex items-center gap-1 text-brand-primary hover:text-brand-primary-hover'
                : 'text-app-muted hover:text-brand-primary'
            }`}
            aria-label={isContinueWatching ? `Resume ${media.title}` : `Details for ${media.title}`}
          >
            {isContinueWatching ? (
              <>
                <span>Resume</span>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </>
            ) : (
              'Details'
            )}
          </Link>
        </div>
      </div>
    </article>
  );
}

