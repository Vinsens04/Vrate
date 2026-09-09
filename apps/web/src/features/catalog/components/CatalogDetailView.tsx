'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDuration } from '@/features/library/utils/library-logic';
import type { CatalogMedia, InitialLibraryStatus } from '../types/catalog-types';
import { formatProviderScore } from '../utils/catalog-logic';
import { isAllowedImageUrl } from '../utils/image-urls';
import { AddToLibraryModal } from './AddToLibraryModal';
import { CatalogPoster } from './CatalogPoster';

interface CatalogDetailViewProps {
  media: CatalogMedia;
}

export function CatalogDetailView({ media: initialMedia }: CatalogDetailViewProps) {
  const [media, setMedia] = useState(initialMedia);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasBackdrop = Boolean(media.backdropUrl && isAllowedImageUrl(media.backdropUrl));
  const ratingLabel = formatProviderScore(media);

  const typeLabel =
    media.category === 'anime'
      ? 'Anime'
      : media.mediaType === 'movie'
      ? 'Film'
      : 'Serial TV';

  const providerName = media.provider === 'tmdb' ? 'The Movie Database (TMDB)' : 'AniList';
  const providerExternalUrl =
    media.provider === 'tmdb'
      ? `https://www.themoviedb.org/${media.providerMediaType || (media.mediaType === 'movie' ? 'movie' : 'tv')}/${media.externalId}`
      : `https://anilist.co/anime/${media.externalId}`;

  return (
    <div className="space-y-8">
      {/* Navigation & Breadcrumb */}
      <div>
        <Link
          href="/dashboard/discover"
          className="inline-flex items-center gap-2 text-xs font-medium text-app-muted hover:text-app-text transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Kembali ke Pencarian Temukan</span>
        </Link>
      </div>

      {/* Backdrop Banner (if available) */}
      {hasBackdrop && (
        <div className="relative -mx-5 -mt-4 sm:-mx-8 lg:-mx-10 h-64 sm:h-80 md:h-96 overflow-hidden border-b border-app-border bg-app-surface">
          <Image
            src={media.backdropUrl!}
            alt={`Backdrop ${media.title}`}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-35 filter blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-app-bg via-app-bg/50 to-transparent" />
        </div>
      )}

      {/* Main Content Layout */}
      <div className={`grid grid-cols-1 md:grid-cols-12 gap-8 ${hasBackdrop ? '-mt-24 sm:-mt-36 relative z-10' : ''}`}>
        {/* Poster Column */}
        <div className="md:col-span-4 lg:col-span-3">
          <div className="overflow-hidden rounded-card border border-app-border bg-app-surface shadow-xl">
            <CatalogPoster
              posterUrl={media.posterUrl}
              title={media.title}
              category={media.category}
              className="aspect-2/3 w-full"
              priority
            />
          </div>

          {/* Action Button */}
          <div className="mt-4">
            {media.inLibrary ? (
              <Link
                href={media.libraryEntryId ? `/dashboard/library/${media.libraryEntryId}` : '/dashboard/library'}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-btn border border-brand-primary bg-brand-primary/10 px-4 py-2.5 text-sm font-semibold text-brand-primary transition hover:bg-brand-primary/20"
              >
                <svg className="h-4 w-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Sudah di Library Kamu</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="vr-primary w-full min-h-[44px] text-sm font-semibold"
              >
                + Tambah ke Library
              </button>
            )}
          </div>
        </div>

        {/* Details Column */}
        <div className="md:col-span-8 lg:col-span-9 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-btn bg-app-elevated border border-app-border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-app-text">
                {typeLabel}
              </span>
              <span
                className={`rounded-btn border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                  media.provider === 'anilist'
                    ? 'bg-blue-950/80 text-blue-300 border-blue-800/50'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50'
                }`}
              >
                {media.provider === 'anilist' ? 'AniList' : 'TMDB'}
              </span>
              {media.status && (
                <span className="rounded-btn bg-app-surface border border-app-border px-2.5 py-0.5 text-xs text-app-dim">
                  {media.status}
                </span>
              )}
            </div>

            <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-app-text">
              {media.title}
            </h1>

            {media.originalTitle && (
              <p className="mt-1 text-sm text-app-dim italic">
                Judul Asli: {media.originalTitle}
              </p>
            )}
          </div>

          {/* Metadata Grid Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-card border border-app-border bg-app-surface p-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-app-dim">Rilis</span>
              <p className="mt-0.5 text-sm font-medium text-app-text">
                {media.releaseDate || (media.releaseYear ? String(media.releaseYear) : '-')}
              </p>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-app-dim">Durasi / Format</span>
              <p className="mt-0.5 text-sm font-medium text-app-text">
                {media.runtimeMinutes ? formatDuration(media.runtimeMinutes) : '-'}
              </p>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-app-dim">Episode / Musim</span>
              <p className="mt-0.5 text-sm font-medium text-app-text">
                {media.totalEpisodes
                  ? `${media.totalEpisodes} Ep`
                  : media.totalSeasons
                  ? `${media.totalSeasons} Musim`
                  : '-'}
              </p>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-app-dim">Rating Provider</span>
              <p className="mt-0.5 text-sm font-semibold text-brand-warning">
                {ratingLabel}
              </p>
            </div>
          </div>

          {/* Genres */}
          {media.genres.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-app-dim mb-2">
                Genre
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {media.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-btn border border-app-border bg-app-elevated px-3 py-1 text-xs text-app-muted"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Overview / Synopsis */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-app-dim mb-2">
              Sinopsis
            </h3>
            {media.overview ? (
              <p className="text-sm leading-relaxed text-app-muted whitespace-pre-line">
                {media.overview}
              </p>
            ) : (
              <p className="text-sm italic text-app-dim">
                Tidak ada sinopsis yang tersedia untuk media ini.
              </p>
            )}
          </div>

          {/* Provider Attribution Notice */}
          <div className="border-t border-app-border pt-4 text-xs text-app-dim">
            <p>
              Metadata bersumber dari{' '}
              <a
                href={providerExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-app-text underline decoration-app-border hover:text-brand-primary"
              >
                {providerName}
              </a>
              . Seluruh hak cipta dimiliki oleh pemilik lisensi masing-masing.
            </p>
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
        }}
      />
    </div>
  );
}
