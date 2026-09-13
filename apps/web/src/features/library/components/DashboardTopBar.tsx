'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DashboardTopBarProps {
  displayName: string;
}

export function DashboardTopBar({ displayName }: DashboardTopBarProps) {
  const router = useRouter();
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, []);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        router.push('/dashboard/discover');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <header className="sticky top-0 z-30 hidden h-16 w-full items-center justify-between border-b border-app-border/70 bg-app-bg/80 px-8 backdrop-blur-xl md:flex lg:px-10">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-app-muted">
          {greeting}, <strong className="font-semibold text-app-text">{displayName}</strong>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/discover"
          className="group flex h-9 w-64 items-center justify-between rounded-xl border border-app-border/80 bg-app-surface/60 px-3 text-xs text-app-dim transition-all duration-150 hover:border-white/15 hover:bg-app-elevated/70 hover:text-app-muted"
        >
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-app-dim transition-colors group-hover:text-app-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search titles...</span>
          </div>
          <kbd className="flex h-5 items-center rounded border border-app-border/80 bg-app-bg/60 px-1.5 font-mono text-[10px] text-app-dim">
            ⌘K
          </kbd>
        </Link>

        <Link
          href="/dashboard/discover"
          className="flex h-9 items-center gap-1.5 rounded-xl bg-brand-primary/15 px-3.5 text-xs font-semibold text-brand-primary transition-all duration-150 hover:bg-brand-primary hover:text-white"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Discover</span>
        </Link>
      </div>
    </header>
  );
}
