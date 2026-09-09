'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { isAllowedImageUrl } from '../utils/image-urls';

interface CatalogPosterProps {
  posterUrl: string | null | undefined;
  title: string;
  category?: 'movie' | 'tv' | 'anime';
  className?: string;
  priority?: boolean;
}

export function CatalogPoster({
  posterUrl,
  title,
  category = 'movie',
  className = '',
  priority = false,
}: CatalogPosterProps) {
  const [imgError, setImgError] = useState(false);

  const isValidUrl = Boolean(posterUrl && isAllowedImageUrl(posterUrl));

  if (!isValidUrl || imgError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-app-surface p-3 text-center text-app-dim border border-app-border ${className}`}
        aria-hidden="true"
      >
        <svg
          className="h-8 w-8 text-app-dim/60 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          {category === 'anime' ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          )}
        </svg>
        <span className="line-clamp-2 text-xs font-medium text-app-muted">
          {title}
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-wider text-app-dim">
          Tidak ada poster
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-app-surface ${className}`}>
      <Image
        src={posterUrl!}
        alt={`Poster ${title}`}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        className="object-cover transition duration-300 group-hover:scale-105"
        priority={priority}
        onError={() => setImgError(true)}
      />
    </div>
  );
}
