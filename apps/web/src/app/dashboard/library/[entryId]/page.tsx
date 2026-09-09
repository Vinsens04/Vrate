import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLibraryEntryDetail } from '@/features/library/queries/library-queries';
import {
  formatDate,
  formatDuration,
  formatMediaType,
  formatRelativeTime,
} from '@/features/library/utils/library-logic';
import { PosterImage } from '@/features/library/components/PosterImage';
import { StatusSelect } from '@/features/library/components/StatusSelect';
import { RatingControl } from '@/features/library/components/RatingControl';
import { FavoriteButton } from '@/features/library/components/FavoriteButton';
import { NotesForm } from '@/features/library/components/NotesForm';
import { DeleteEntryDialog } from '@/features/library/components/DeleteEntryDialog';
import { EpisodeProgressList } from '@/features/library/components/EpisodeProgressList';
import { WatchSessionsList } from '@/features/library/components/WatchSessionsList';

interface DetailPageProps {
  params: Promise<{
    entryId: string;
  }>;
}

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { entryId } = await params;
  const data = await getLibraryEntryDetail(entryId);
  if (!data) {
    return { title: 'Media Tidak Ditemukan - Vrate' };
  }
  return {
    title: `${data.entry.media.title} - Vrate`,
    description: data.entry.media.overview || 'Detail media dalam library kamu.',
  };
}

export default async function LibraryEntryDetailPage({ params }: DetailPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { entryId } = await params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(entryId)) {
    notFound();
  }

  const data = await getLibraryEntryDetail(entryId);

  if (!data) {
    notFound();
  }

  const { entry, episodeProgressList, watchSessionsList } = data;
  const { media } = entry;
  const metaItems = [
    formatMediaType(media.mediaType),
    media.releaseYear ? String(media.releaseYear) : null,
    media.runtimeMinutes ? formatDuration(media.runtimeMinutes) : null,
    media.totalEpisodes ? `${media.totalEpisodes} episode` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-app-dim">
        <Link href="/dashboard" className="transition hover:text-brand-primary">Overview</Link>
        <span>/</span>
        <Link href="/dashboard/library" className="transition hover:text-brand-primary">Library</Link>
        <span>/</span>
        <span className="truncate text-app-text">{media.title}</span>
      </nav>

      {media.backdropUrl && (
        <div className="relative h-40 overflow-hidden border border-app-border sm:h-52" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.backdropUrl} alt="" className="h-full w-full object-cover opacity-45 grayscale" />
          <div className="absolute inset-0 bg-gradient-to-r from-app-bg via-app-bg/55 to-app-bg/20" />
        </div>
      )}

      <section className="grid gap-8 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <PosterImage posterUrl={media.posterUrl} title={media.title} mediaType={media.mediaType} className="w-full" />

          <div className="divide-y divide-app-border border-y border-app-border text-sm">
            <div className="flex justify-between gap-4 py-3">
              <span className="text-app-dim">Ditambahkan</span>
              <span className="text-right text-app-text">{formatDate(entry.createdAt)}</span>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <span className="text-app-dim">Mulai</span>
              <span className="text-right text-app-text">{formatDate(entry.startedAt)}</span>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <span className="text-app-dim">Selesai</span>
              <span className="text-right text-app-text">{formatDate(entry.completedAt)}</span>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <span className="text-app-dim">Terakhir</span>
              <span className="text-right text-app-text">{entry.lastWatchedAt ? formatRelativeTime(entry.lastWatchedAt) : '-'}</span>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-10">
          <header className="border-b border-app-border pb-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="vr-label">{metaItems.join(' / ')}</p>
                <h1 className="mt-3 text-balance text-4xl font-semibold leading-tight text-app-text sm:text-6xl">
                  {media.title}
                </h1>
                {media.originalTitle && media.originalTitle !== media.title && (
                  <p className="mt-3 text-sm italic text-app-dim">{media.originalTitle}</p>
                )}
              </div>
              <FavoriteButton entryId={entry.id} isFavorite={entry.isFavorite} />
            </div>
          </header>

          {media.overview && (
            <section aria-labelledby="synopsis-heading" className="max-w-3xl space-y-3">
              <p id="synopsis-heading" className="vr-label">Sinopsis</p>
              <p className="text-base leading-8 text-app-muted">{media.overview}</p>
            </section>
          )}

          <section aria-labelledby="status-heading" className="border-y border-app-border py-6">
            <h2 id="status-heading" className="vr-label">Status dan rating</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <StatusSelect entryId={entry.id} currentStatus={entry.status} />
              <RatingControl entryId={entry.id} currentRating={entry.rating} />
            </div>
          </section>

          <section aria-labelledby="notes-heading" className="space-y-4">
            <h2 id="notes-heading" className="text-2xl font-semibold text-app-text">Catatan</h2>
            <NotesForm entryId={entry.id} initialNotes={entry.notes} />
          </section>

          {media.mediaType === 'series' && (
            <section aria-labelledby="episode-progress-heading" className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="vr-label">Progres</p>
                  <h2 id="episode-progress-heading" className="mt-2 text-2xl font-semibold text-app-text">
                    Episode
                  </h2>
                </div>
                <span className="font-mono text-xs text-app-dim">{episodeProgressList.length} tercatat</span>
              </div>
              <EpisodeProgressList items={episodeProgressList} />
            </section>
          )}

          <section aria-labelledby="watch-sessions-heading" className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="vr-label">Riwayat</p>
                <h2 id="watch-sessions-heading" className="mt-2 text-2xl font-semibold text-app-text">
                  Sesi menonton
                </h2>
              </div>
              <span className="font-mono text-xs text-app-dim">{watchSessionsList.length} sesi</span>
            </div>
            <WatchSessionsList items={watchSessionsList} />
          </section>

          <section className="border-t border-app-border pt-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-app-text">Hapus dari koleksi</h3>
                <p className="mt-1 max-w-xl text-sm leading-6 text-app-dim">
                  Gunakan hanya kalau media ini tidak ingin disimpan bersama progres, rating, dan catatanmu.
                </p>
              </div>
              <DeleteEntryDialog entryId={entry.id} mediaTitle={media.title} />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

