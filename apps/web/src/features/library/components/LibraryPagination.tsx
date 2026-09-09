'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { buildLibraryUrl } from '../utils/library-logic';

interface LibraryPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export function LibraryPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
}: LibraryPaginationProps) {
  const searchParams = useSearchParams();
  const currentParams = Object.fromEntries(searchParams.entries());

  if (totalCount === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const prevHref = currentPage > 1 ? buildLibraryUrl('/dashboard/library', currentParams, { page: currentPage - 1 }) : null;
  const nextHref = currentPage < totalPages ? buildLibraryUrl('/dashboard/library', currentParams, { page: currentPage + 1 }) : null;

  return (
    <nav aria-label="Navigasi halaman koleksi" className="flex flex-col items-center justify-between gap-4 border-t border-app-border pt-6 sm:flex-row">
      <div className="text-sm text-app-dim">
        <span className="font-medium text-app-text">{startItem}-{endItem}</span> dari{' '}
        <span className="font-medium text-app-text">{totalCount}</span> judul
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {prevHref ? (
            <Link href={prevHref} className="vr-secondary min-h-[40px] px-3.5 py-2 text-xs">
              Sebelumnya
            </Link>
          ) : (
            <span className="inline-flex min-h-[40px] cursor-not-allowed items-center border border-app-border px-3.5 py-2 text-xs font-semibold text-app-dim opacity-50">
              Sebelumnya
            </span>
          )}

          <span className="px-2 text-xs font-medium text-app-dim">
            {currentPage} / {totalPages}
          </span>

          {nextHref ? (
            <Link href={nextHref} className="vr-secondary min-h-[40px] px-3.5 py-2 text-xs">
              Berikutnya
            </Link>
          ) : (
            <span className="inline-flex min-h-[40px] cursor-not-allowed items-center border border-app-border px-3.5 py-2 text-xs font-semibold text-app-dim opacity-50">
              Berikutnya
            </span>
          )}
        </div>
      )}
    </nav>
  );
}

