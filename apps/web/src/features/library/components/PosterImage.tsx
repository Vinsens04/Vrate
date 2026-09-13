import React from 'react';
import type { MediaType } from '@vrate/shared';

interface PosterImageProps {
  posterUrl: string | null;
  title: string;
  mediaType?: MediaType;
  aspectRatio?: 'poster' | 'backdrop';
  className?: string;
}

export function PosterImage({
  posterUrl,
  title,
  mediaType = 'movie',
  aspectRatio = 'poster',
  className = '',
}: PosterImageProps) {
  const aspectClass = aspectRatio === 'backdrop' ? 'aspect-video' : 'aspect-[2/3]';
  const typeLabel = mediaType === 'movie' ? 'Movie' : 'Series';

  if (!posterUrl) {
    return (
      <div
        className={`relative flex flex-col justify-between overflow-hidden rounded-xl border border-app-border/70 bg-gradient-to-br from-app-surface via-app-elevated to-app-secondary p-4 shadow-sm ${aspectClass} ${className}`}
        aria-label={`Poster fallback for ${title}`}
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-app-surface/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-app-dim border border-white/5">
            {typeLabel}
          </span>
          <svg className="h-4 w-4 text-app-dim/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M1.5 5.625v1.5c0 .621.504 1.125 1.125 1.125" />
          </svg>
        </div>
        <div>
          <div className="mb-2.5 h-0.5 w-8 rounded-full bg-brand-primary" />
          <span className="line-clamp-3 text-xs font-semibold leading-5 text-app-text">{title}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-app-border/80 bg-app-surface shadow-card ${aspectClass} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterUrl}
        alt={`${typeLabel} ${title}`}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-105"
      />
    </div>
  );
}

