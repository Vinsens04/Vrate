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
      className={`inline-flex items-center justify-center border border-app-border bg-app-bg/90 text-app-muted transition duration-150 hover:border-app-muted hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-60 ${buttonSize} ${
        isFavorite ? 'border-brand-primary text-brand-primary' : ''
      } ${className}`}
      aria-label={isFavorite ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}
      title={isFavorite ? 'Favorit' : 'Bukan favorit'}
    >
      <svg className={iconSize} viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 4.75h11v15l-5.5-3.4-5.5 3.4v-15z" />
      </svg>
    </button>
  );
}

