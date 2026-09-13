import React from 'react';
import Link from 'next/link';

interface StatCardProps {
  label: string;
  count: number;
  statusKey?: string;
  accentColor: 'indigo' | 'amber' | 'emerald' | 'sky' | 'rose' | 'zinc';
  icon: React.ReactNode;
}

export function StatCard({ label, count, statusKey, icon }: StatCardProps) {
  const href = statusKey ? `/dashboard/library?status=${statusKey}` : '/dashboard/library';

  return (
    <Link href={href} className="group block border-y border-app-border py-4 transition hover:bg-app-surface sm:px-4">
      <div className="flex items-center justify-between gap-4">
        <span className="vr-label group-hover:text-app-muted">{label}</span>
        <span className="text-app-dim" aria-hidden="true">{icon}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight text-app-text">{count}</span>
        <span className="text-xs text-app-dim">titles</span>
      </div>
    </Link>
  );
}

