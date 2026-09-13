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
    { key: 'all', label: 'All' },
    ...LIBRARY_STATUSES.map(status => ({
      key: status,
      label: formatStatusLabel(status),
    })),
  ];

  const currentParams = Object.fromEntries(searchParams.entries());

  return (
    <nav aria-label="Filter watch status" className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-app-border/70 bg-app-surface/60 p-1 backdrop-blur-md">
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
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
              isActive
                ? 'bg-brand-primary/15 text-brand-primary font-semibold shadow-sm border border-brand-primary/25'
                : 'text-app-muted hover:bg-app-elevated/80 hover:text-app-text'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.key === 'watching' && <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />}
            {tab.key === 'completed' && <span className="h-1.5 w-1.5 rounded-full bg-brand-success" />}
            {tab.key === 'paused' && <span className="h-1.5 w-1.5 rounded-full bg-brand-warning" />}
            {tab.key === 'dropped' && <span className="h-1.5 w-1.5 rounded-full bg-brand-danger" />}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

