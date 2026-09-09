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
  const typeLabel = mediaType === 'movie' ? 'Film' : 'Serial';

  if (!posterUrl) {
    return (
      <div
        className={`relative flex flex-col justify-between overflow-hidden border border-app-border bg-app-surface p-4 ${aspectClass} ${className}`}
        aria-label={`Poster fallback untuk ${title}`}
      >
        <span className="vr-label">{typeLabel}</span>
        <div>
          <div className="mb-4 h-px w-12 bg-brand-primary" />
          <span className="line-clamp-3 text-sm font-semibold leading-6 text-app-text">{title}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative overflow-hidden border border-app-border bg-app-surface ${aspectClass} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterUrl}
        alt={`${typeLabel} ${title}`}
        loading="lazy"
        className="h-full w-full object-cover transition duration-200 group-hover:brightness-110"
      />
    </div>
  );
}

