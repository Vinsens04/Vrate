import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPaginatedLibrary } from '@/features/library/queries/library-queries';
import {
  parseFilterStatus,
  parseSortOption,
  parsePageNumber,
  formatStatusLabel,
} from '@/features/library/utils/library-logic';
import { MediaCard } from '@/features/library/components/MediaCard';
import { LibraryFilters } from '@/features/library/components/LibraryFilters';
import { LibrarySearch } from '@/features/library/components/LibrarySearch';
import { LibrarySort } from '@/features/library/components/LibrarySort';
import { LibraryPagination } from '@/features/library/components/LibraryPagination';
import { EmptyState } from '@/features/library/components/EmptyState';

export const metadata: Metadata = {
  title: 'Library - Vrate',
  description: 'Manage and explore your watchlist, active watches, and media history.',
};

interface LibraryPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const status = parseFilterStatus(resolvedParams.status);
  const sort = parseSortOption(resolvedParams.sort);
  const page = parsePageNumber(resolvedParams.page);
  const query = resolvedParams.q || '';

  const { items, totalCount, totalPages, pageSize } = await getPaginatedLibrary({
    status,
    query,
    sort,
    page,
    pageSize: 24,
  });

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-app-border/80 bg-gradient-to-b from-app-surface/90 via-app-secondary/60 to-app-bg p-6 sm:p-8 shadow-card">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-app-surface/80 px-3 py-1 text-[11px] font-medium text-app-muted backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
              <span>Collection</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-app-text sm:text-5xl">Library</h1>
            <p className="mt-2 text-sm text-app-muted">
              <strong className="font-semibold text-app-text">{totalCount}</strong> results. Manage your watchlist, progress, personal ratings, and notes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/discover"
              className="vr-primary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Discover Media</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-label="Library controls">
        <LibraryFilters />
        <div className="flex flex-col gap-3 rounded-xl border border-app-border/70 bg-app-surface/40 p-3.5 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
          <LibrarySearch />
          <LibrarySort />
        </div>
      </section>

      {items.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map(entry => (
              <MediaCard key={entry.id} entry={entry} />
            ))}
          </div>

          <LibraryPagination currentPage={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} />
        </div>
      ) : (
        <div>
          {query.trim().length > 0 ? (
            <EmptyState
              title="No matching results found."
              description={`No media found matching "${query}" in your collection. Try a different keyword or clear search.`}
              actionLabel="Clear search"
              actionHref="/dashboard/library"
            />
          ) : status !== 'all' ? (
            <EmptyState
              title={`No ${formatStatusLabel(status).toLowerCase()} media yet.`}
              description={`The ${formatStatusLabel(status).toLowerCase()} category currently has no entries.`}
              actionLabel="View all statuses"
              actionHref="/dashboard/library"
            />
          ) : (
            <EmptyState
              title="Your library is currently empty."
              description="Search for movies, series, or anime from TMDB and AniList to start building your personal library."
              actionLabel="Discover Media"
              actionHref="/dashboard/discover"
              secondaryNotice="This collection queries authentic Supabase data secured by Row Level Security."
            />
          )}
        </div>
      )}
    </div>
  );
}
