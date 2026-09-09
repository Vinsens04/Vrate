import type { Metadata } from 'next';
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
  description: 'Kelola dan jelajahi watchlist, tontonan aktif, dan riwayat media kamu.',
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
      <section className="border-b border-app-border pb-7">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="vr-label">Library</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-app-text sm:text-6xl">Library</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-app-muted">
              {totalCount} hasil. Kelola watchlist, progres episode, rating, dan catatan tontonanmu.
            </p>
          </div>
          <div className="text-xs leading-6 text-app-dim lg:max-w-xs lg:text-right">
            Katalog TMDB dan AniList akan tersedia pada Step 5. Tidak ada data film palsu yang ditampilkan.
          </div>
        </div>
      </section>

      <section className="space-y-5" aria-label="Kontrol library">
        <LibraryFilters />
        <div className="flex flex-col gap-3 border-y border-app-border py-4 lg:flex-row lg:items-center lg:justify-between">
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
              title="Tidak ada hasil yang cocok."
              description={`Tidak ditemukan media dengan judul "${query}" dalam koleksimu. Coba kata kunci lain atau hapus pencarian.`}
              actionLabel="Hapus pencarian"
              actionHref="/dashboard/library"
            />
          ) : status !== 'all' ? (
            <EmptyState
              title={`Belum ada media ${formatStatusLabel(status).toLowerCase()}.`}
              description={`Kategori ${formatStatusLabel(status).toLowerCase()} belum memiliki entri media.`}
              actionLabel="Lihat semua status"
              actionHref="/dashboard/library"
            />
          ) : (
            <EmptyState
              title="Library kamu masih kosong."
              description="Cari film, serial, atau anime dan mulai bangun library-mu saat fitur katalog tersedia."
              secondaryNotice="Koleksi ini membaca data Supabase asli melalui Row Level Security."
            />
          )}
        </div>
      )}
    </div>
  );
}
