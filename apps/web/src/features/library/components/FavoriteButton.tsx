'use client';

import React, { useTransition } from 'react';
import { toggleFavoriteAction } from '../actions/library-actions';

interface FavoriteButtonProps {
  entryId: string;
  isFavorite: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function FavoriteButton({
  entryId,
  isFavorite,
  size = 'md',
  className = '',
}: FavoriteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await toggleFavoriteAction(entryId, !isFavorite);
    });
  };

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const buttonSize = size === 'sm' ? 'h-9 w-9' : 'h-10 w-10';

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center justify-center rounded-full border backdrop-blur-md transition-all duration-150 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-60 ${buttonSize} ${
        isFavorite
          ? 'border-brand-primary/40 bg-brand-primary/20 text-brand-primary shadow-glow-subtle'
          : 'border-white/10 bg-black/60 text-white/70 hover:border-white/30 hover:bg-black/80 hover:text-white'
      } ${className}`}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorite ? 'Favorite' : 'Not favorite'}
    >
      <svg className={iconSize} viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 4.75h11v15l-5.5-3.4-5.5 3.4v-15z" />
      </svg>
    </button>
  );
}

