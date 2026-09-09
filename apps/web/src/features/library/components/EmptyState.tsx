import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryNotice?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  secondaryNotice,
}: EmptyStateProps) {
  return (
    <div className="border-y border-app-border py-12 text-center sm:py-16">
      <div className="mx-auto max-w-lg">
        <p className="font-editorial text-5xl text-brand-primary" aria-hidden="true">00</p>
        <h3 className="mt-4 text-2xl font-semibold text-app-text">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-app-muted">{description}</p>

        {secondaryNotice && (
          <p className="mt-5 border-t border-app-border pt-4 text-xs leading-6 text-app-dim">
            {secondaryNotice}
          </p>
        )}

        {actionLabel && actionHref && (
          <div className="mt-7">
            <Link href={actionHref} className="vr-primary">
              {actionLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

