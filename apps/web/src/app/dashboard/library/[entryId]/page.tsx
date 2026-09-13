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
    return { title: 'Media Not Found - Vrate' };
  }
  return {
    title: `${data.entry.media.title} - Vrate`,
    description: data.entry.media.overview || 'Media details in your library.',
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
    media.totalEpisodes ? `${media.totalEpisodes} episodes` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-10">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="inline-flex items-center gap-2 rounded-full border border-app-border/70 bg-app-surface/60 px-4 py-1.5 text-xs text-app-dim backdrop-blur-md">
        <Link href="/dashboard" className="transition-colors hover:text-brand-primary">Overview</Link>
        <span className="text-app-dim/50">/</span>
        <Link href="/dashboard/library" className="transition-colors hover:text-brand-primary">Library</Link>
        <span className="text-app-dim/50">/</span>
        <span className="max-w-[200px] truncate font-medium text-app-text sm:max-w-xs">{media.title}</span>
      </nav>

      {/* Cinematic Hero Backdrop Banner */}
      {media.backdropUrl ? (
        <div className="relative -mx-4 h-64 overflow-hidden rounded-2xl border border-app-border/80 shadow-2xl sm:-mx-0 sm:h-80 md:h-96" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.backdropUrl}
            alt=""
            className="h-full w-full object-cover brightness-75 contrast-105 transition-transform duration-700 ease-out"
          />
          {/* Gradient Masks */}
          <div className="absolute inset-0 bg-gradient-to-t from-app-bg via-app-bg/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-app-bg/90 via-transparent to-app-bg/30" />
        </div>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
        {/* Left Column: Poster & Metadata Quick Facts */}
        <aside className="space-y-6">
          <div className="group overflow-hidden rounded-2xl border border-app-border/80 shadow-2xl">
            <PosterImage posterUrl={media.posterUrl} title={media.title} mediaType={media.mediaType} className="w-full" />
          </div>

          <div className="rounded-2xl border border-app-border/70 bg-app-surface/60 p-5 shadow-sm backdrop-blur-md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-app-dim">Quick Facts</h3>
            <div className="mt-4 divide-y divide-app-border/60 text-xs">
              <div className="flex justify-between gap-4 py-2.5">
                <span className="text-app-dim">Added</span>
                <span className="text-right font-medium text-app-text">{formatDate(entry.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <span className="text-app-dim">Started</span>
                <span className="text-right font-medium text-app-text">{formatDate(entry.startedAt)}</span>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <span className="text-app-dim">Completed</span>
                <span className="text-right font-medium text-app-text">{formatDate(entry.completedAt)}</span>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <span className="text-app-dim">Last Watched</span>
                <span className="text-right font-medium text-app-text">{entry.lastWatchedAt ? formatRelativeTime(entry.lastWatchedAt) : '-'}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Title, Synopsis, Status & History */}
        <div className="min-w-0 space-y-8">
          <header className="rounded-2xl border border-app-border/70 bg-app-surface/60 p-6 shadow-sm backdrop-blur-md sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-primary/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-primary border border-brand-primary/20">
                    {formatMediaType(media.mediaType)}
                  </span>
                  {media.releaseYear && (
                    <span className="rounded-full border border-app-border bg-app-elevated px-2.5 py-1 text-[11px] font-medium text-app-muted">
                      {media.releaseYear}
                    </span>
                  )}
                  {media.runtimeMinutes && (
                    <span className="rounded-full border border-app-border bg-app-elevated px-2.5 py-1 text-[11px] font-medium text-app-muted">
                      {formatDuration(media.runtimeMinutes)}
                    </span>
                  )}
                  {media.totalEpisodes && (
                    <span className="rounded-full border border-app-border bg-app-elevated px-2.5 py-1 text-[11px] font-medium text-app-muted">
                      {media.totalEpisodes} Episodes
                    </span>
                  )}
                </div>

                <h1 className="text-balance text-3xl font-bold tracking-tight text-app-text sm:text-5xl">
                  {media.title}
                </h1>

                {media.originalTitle && media.originalTitle !== media.title && (
                  <p className="text-sm italic text-app-dim">{media.originalTitle}</p>
                )}
              </div>

              <div className="shrink-0">
                <FavoriteButton entryId={entry.id} isFavorite={entry.isFavorite} />
              </div>
            </div>
          </header>

          {/* Synopsis */}
          {media.overview && (
            <section aria-labelledby="synopsis-heading" className="rounded-2xl border border-app-border/70 bg-app-surface/60 p-6 shadow-sm backdrop-blur-md sm:p-8">
              <h2 id="synopsis-heading" className="text-xs font-semibold uppercase tracking-wider text-app-dim">
                Synopsis
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-app-muted sm:text-base sm:leading-8">
                {media.overview}
              </p>
            </section>
          )}

          {/* Status & Rating */}
          <section aria-labelledby="status-heading" className="rounded-2xl border border-app-border/70 bg-app-surface/60 p-6 shadow-sm backdrop-blur-md sm:p-8">
            <h2 id="status-heading" className="text-xs font-semibold uppercase tracking-wider text-app-dim">
              Collection Status & Rating
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <StatusSelect entryId={entry.id} currentStatus={entry.status} />
              <RatingControl entryId={entry.id} currentRating={entry.rating} />
            </div>
          </section>

          {/* Personal Notes */}
          <section aria-labelledby="notes-heading" className="rounded-2xl border border-app-border/70 bg-app-surface/60 p-6 shadow-sm backdrop-blur-md sm:p-8">
            <h2 id="notes-heading" className="text-lg font-semibold text-app-text">Personal Notes</h2>
            <div className="mt-4">
              <NotesForm entryId={entry.id} initialNotes={entry.notes} />
            </div>
          </section>

          {/* Series Episode Progress */}
          {media.mediaType === 'series' && (
            <section aria-labelledby="episode-progress-heading" className="rounded-2xl border border-app-border/70 bg-app-surface/60 p-6 shadow-sm backdrop-blur-md sm:p-8">
              <div className="flex items-end justify-between gap-4 border-b border-app-border/60 pb-4">
                <div>
                  <p className="vr-label">Progress</p>
                  <h2 id="episode-progress-heading" className="mt-1 text-xl font-semibold text-app-text">
                    Episode Progress
                  </h2>
                </div>
                <span className="font-mono text-xs text-app-dim">{episodeProgressList.length} recorded</span>
              </div>
              <div className="mt-4">
                <EpisodeProgressList items={episodeProgressList} />
              </div>
            </section>
          )}

          {/* Watch Sessions History */}
          <section aria-labelledby="watch-sessions-heading" className="rounded-2xl border border-app-border/70 bg-app-surface/60 p-6 shadow-sm backdrop-blur-md sm:p-8">
            <div className="flex items-end justify-between gap-4 border-b border-app-border/60 pb-4">
              <div>
                <p className="vr-label">History</p>
                <h2 id="watch-sessions-heading" className="mt-1 text-xl font-semibold text-app-text">
                  Watch Sessions
                </h2>
              </div>
              <span className="font-mono text-xs text-app-dim">{watchSessionsList.length} sessions</span>
            </div>
            <div className="mt-4">
              <WatchSessionsList items={watchSessionsList} />
            </div>
          </section>

          {/* Danger Zone */}
          <section className="rounded-2xl border border-brand-danger/20 bg-brand-danger/5 p-6 backdrop-blur-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-brand-danger">Remove from collection</h3>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-app-dim">
                  Removes this media along with its tracked episode progress, personal rating, and notes.
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

