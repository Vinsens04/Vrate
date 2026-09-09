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
  description: 'Ringkasan koleksi film, serial, dan anime kamu.',
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

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'Pengguna';

  const [summary, recentEntries, continueWatching] = await Promise.all([
    getDashboardSummary(),
    getRecentEntries(6),
    getContinueWatchingEntries(6),
  ]);

  const totalMedia = summary?.totalCount ?? 0;
  const statusItems = [
    { label: 'Watchlist', value: summary?.watchlistCount ?? 0, href: '/dashboard/library?status=watchlist' },
    { label: 'Sedang ditonton', value: summary?.watchingCount ?? 0, href: '/dashboard/library?status=watching' },
    { label: 'Selesai', value: summary?.completedCount ?? 0, href: '/dashboard/library?status=completed' },
    { label: 'Dijeda', value: summary?.pausedCount ?? 0, href: '/dashboard/library?status=paused' },
    { label: 'Dihentikan', value: summary?.droppedCount ?? 0, href: '/dashboard/library?status=dropped' },
  ];

  return (
    <div className="space-y-12">
      <section className="border-b border-app-border pb-10">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="vr-label">Library</p>
            <h1 className="mt-3 text-5xl font-semibold leading-none text-app-text sm:text-7xl">
              {totalMedia}
              <span className="ml-3 align-baseline text-lg font-medium text-app-dim">judul</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-app-muted">
              Halo, {displayName}. Ini ringkasan tontonan yang sudah kamu simpan di Vrate.
            </p>
          </div>
          <Link href="/dashboard/library" className="vr-primary w-full sm:w-auto">
            Buka Library
          </Link>
        </div>

        <div className="mt-9 grid border-y border-app-border sm:grid-cols-5">
          {statusItems.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-baseline justify-between gap-4 border-b border-app-border py-4 transition hover:bg-app-surface sm:block sm:border-b-0 sm:border-r sm:px-4 sm:last:border-r-0"
            >
              <span className="text-sm text-app-muted">{item.label}</span>
              <span className="text-2xl font-semibold text-app-text sm:mt-2 sm:block">{item.value}</span>
            </Link>
          ))}
        </div>
      </section>

      {totalMedia === 0 ? (
        <EmptyState
          title="Belum ada yang dicatat."
          description="Cari film, serial, atau anime dan mulai bangun library-mu saat fitur katalog tersedia."
          actionLabel="Buka Library"
          actionHref="/dashboard/library"
        />
      ) : (
        <div className="space-y-12">
          {continueWatching.length > 0 && (
            <section aria-labelledby="continue-watching-heading" className="space-y-5">
              <div className="flex items-end justify-between gap-4 border-b border-app-border pb-4">
                <div>
                  <p className="vr-label">Sekarang</p>
                  <h2 id="continue-watching-heading" className="mt-2 text-2xl font-semibold text-app-text">
                    Lanjutkan menonton
                  </h2>
                </div>
                <Link href="/dashboard/library?status=watching" className="hidden text-sm text-app-muted transition hover:text-brand-primary sm:inline-flex">
                  Lihat semua
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {continueWatching.map(entry => (
                  <MediaCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          )}

          {recentEntries.length > 0 && (
            <section aria-labelledby="recent-updates-heading" className="space-y-5">
              <div className="flex items-end justify-between gap-4 border-b border-app-border pb-4">
                <div>
                  <p className="vr-label">Arsip</p>
                  <h2 id="recent-updates-heading" className="mt-2 text-2xl font-semibold text-app-text">
                    Terakhir ditambahkan
                  </h2>
                </div>
                <Link href="/dashboard/library?sort=recent" className="hidden text-sm text-app-muted transition hover:text-brand-primary sm:inline-flex">
                  Lihat semua
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
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

