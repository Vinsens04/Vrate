'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LIBRARY_STATUSES, type LibraryStatus } from '@vrate/shared';
import { buildLibraryUrl, formatStatusLabel, parseFilterStatus } from '../utils/library-logic';

export function LibraryFilters() {
  const searchParams = useSearchParams();
  const currentStatus = parseFilterStatus(searchParams.get('status'));

  const tabs: Array<{ key: LibraryStatus | 'all'; label: string }> = [
    { key: 'all', label: 'Semua' },
    ...LIBRARY_STATUSES.map(status => ({
      key: status,
      label: formatStatusLabel(status),
    })),
  ];

  const currentParams = Object.fromEntries(searchParams.entries());

  return (
    <nav aria-label="Filter status tontonan" className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-2 sm:pb-0">
      {tabs.map(tab => {
        const isActive = currentStatus === tab.key;
        const href = buildLibraryUrl('/dashboard/library', currentParams, {
          status: tab.key,
          page: 1,
        });

        return (
          <Link
            key={tab.key}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
              isActive
                ? 'border-brand-primary text-app-text'
                : 'border-transparent text-app-muted hover:border-app-border hover:text-app-text'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

