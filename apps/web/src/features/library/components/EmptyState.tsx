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
    <div className="mx-auto max-w-lg rounded-2xl border border-app-border/70 bg-gradient-to-b from-app-surface/80 to-app-secondary/60 p-8 text-center shadow-card backdrop-blur-md sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shadow-glow-subtle">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M1.5 5.625v1.5c0 .621.504 1.125 1.125 1.125" />
        </svg>
      </div>

      <h3 className="mt-5 text-xl font-bold tracking-tight text-app-text sm:text-2xl">{title}</h3>
      <p className="mt-2.5 text-sm leading-relaxed text-app-muted">{description}</p>

      {actionLabel && actionHref && (
        <div className="mt-6">
          <Link href={actionHref} className="vr-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>{actionLabel}</span>
          </Link>
        </div>
      )}

      {secondaryNotice && (
        <p className="mt-6 border-t border-app-border/50 pt-4 text-[11px] text-app-dim">
          {secondaryNotice}
        </p>
      )}
    </div>
  );
}

