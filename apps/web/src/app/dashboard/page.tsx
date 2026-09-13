import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getDashboardSummary,
  getRecentEntries,
  getContinueWatchingEntries,
} from '@/features/library/queries/library-queries';
import { MediaCard } from '@/features/library/components/MediaCard';
import { EmptyState } from '@/features/library/components/EmptyState';

export const metadata: Metadata = {
  title: 'Overview - Vrate',
  description: 'Overview of your movies, series, and anime collection.',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';

  const [summary, recentEntries, continueWatching] = await Promise.all([
    getDashboardSummary(),
    getRecentEntries(6),
    getContinueWatchingEntries(6),
  ]);

  const totalMedia = summary?.totalCount ?? 0;
  const statusItems = [
    {
      label: 'Watching',
      value: summary?.watchingCount ?? 0,
      href: '/dashboard/library?status=watching',
      dotColor: 'bg-brand-primary',
      accentHover: 'hover:border-brand-primary/40',
    },
    {
      label: 'Watchlist',
      value: summary?.watchlistCount ?? 0,
      href: '/dashboard/library?status=watchlist',
      dotColor: 'bg-app-dim',
      accentHover: 'hover:border-app-muted/40',
    },
    {
      label: 'Completed',
      value: summary?.completedCount ?? 0,
      href: '/dashboard/library?status=completed',
      dotColor: 'bg-brand-success',
      accentHover: 'hover:border-brand-success/40',
    },
    {
      label: 'Paused',
      value: summary?.pausedCount ?? 0,
      href: '/dashboard/library?status=paused',
      dotColor: 'bg-brand-warning',
      accentHover: 'hover:border-brand-warning/40',
    },
    {
      label: 'Dropped',
      value: summary?.droppedCount ?? 0,
      href: '/dashboard/library?status=dropped',
      dotColor: 'bg-brand-danger',
      accentHover: 'hover:border-brand-danger/40',
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Overview Section */}
      <section className="relative overflow-hidden rounded-2xl border border-app-border/80 bg-gradient-to-b from-app-surface/90 via-app-secondary/60 to-app-bg p-6 sm:p-8 lg:p-10 shadow-card">
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-primary/10 blur-3xl" aria-hidden="true" />

        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-app-surface/80 px-3 py-1 text-[11px] font-medium text-app-muted backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
              <span>Personal Collection</span>
            </div>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-app-text sm:text-6xl">
              {totalMedia}
              <span className="ml-3 text-lg font-normal text-app-dim sm:text-2xl">tracked titles</span>
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-app-muted sm:text-base">
              Welcome back, <strong className="font-semibold text-app-text">{displayName}</strong>. Here is your entertainment progress and latest watch activities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard/discover" className="vr-primary w-full sm:w-auto">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Add Media</span>
            </Link>
            <Link href="/dashboard/library" className="vr-secondary w-full sm:w-auto">
              Open Library
            </Link>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statusItems.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex flex-col justify-between rounded-xl border border-app-border/70 bg-app-surface/60 p-4 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-app-elevated/70 ${item.accentHover}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-app-muted transition-colors group-hover:text-app-text">
                  {item.label}
                </span>
                <span className={`h-2 w-2 rounded-full ${item.dotColor}`} aria-hidden="true" />
              </div>
              <span className="mt-3 text-2xl font-bold tracking-tight text-app-text">
                {item.value}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {totalMedia === 0 ? (
        <EmptyState
          title="Your library is currently empty."
          description="Search movies, TV series, or anime using TMDB and AniList to begin tracking your watches."
          actionLabel="Discover Media"
          actionHref="/dashboard/discover"
        />
      ) : (
        <div className="space-y-12">
          {/* Continue Watching Section */}
          {continueWatching.length > 0 && (
            <section aria-labelledby="continue-watching-heading" className="space-y-5">
              <div className="flex items-end justify-between gap-4 border-b border-app-border/70 pb-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                    <span>In Progress</span>
                  </div>
                  <h2 id="continue-watching-heading" className="mt-1 text-2xl font-bold tracking-tight text-app-text">
                    Continue Watching
                  </h2>
                </div>
                <Link
                  href="/dashboard/library?status=watching"
                  className="group inline-flex items-center gap-1.5 text-xs font-medium text-app-muted transition-colors hover:text-brand-primary"
                >
                  <span>View watching ({summary?.watchingCount ?? continueWatching.length})</span>
                  <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </div>

              {/* Portrait Poster Grid matching Recently Added */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {continueWatching.map(entry => (
                  <MediaCard key={entry.id} entry={entry} variant="continueWatching" />
                ))}
              </div>
            </section>
          )}

          {/* Recently Added Section */}
          {recentEntries.length > 0 && (
            <section aria-labelledby="recent-updates-heading" className="space-y-5">
              <div className="flex items-end justify-between gap-4 border-b border-app-border/70 pb-4">
                <div>
                  <p className="vr-label">Recent Additions</p>
                  <h2 id="recent-updates-heading" className="mt-1 text-2xl font-bold tracking-tight text-app-text">
                    Recently Added
                  </h2>
                </div>
                <Link
                  href="/dashboard/library?sort=added"
                  className="group inline-flex items-center gap-1.5 text-xs font-medium text-app-muted transition-colors hover:text-brand-primary"
                >
                  <span>Explore full collection</span>
                  <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {recentEntries.map(entry => (
                  <MediaCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

