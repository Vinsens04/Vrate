'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/features/auth/actions/auth-actions';
import { Logo } from '@/components/brand/Logo';

interface DashboardNavProps {
  userEmail?: string | null;
  displayName: string;
}

function OverviewIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function LibraryIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function DiscoverIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 8.09l-3.32 7.15-4.5-4.5 7.82-2.65z" />
    </svg>
  );
}

function CreditsIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

function SignOutIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}

export function DashboardNav({ userEmail, displayName }: DashboardNavProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: <OverviewIcon /> },
    { href: '/dashboard/library', label: 'Library', icon: <LibraryIcon /> },
    { href: '/dashboard/discover', label: 'Discover', icon: <DiscoverIcon /> },
  ];

  const userInitial = displayName.charAt(0).toUpperCase();

  const navContent = (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-app-dim">Navigation</p>
          <nav className="mt-2 space-y-1" aria-label="Dashboard navigation">
            {navItems.map(item => {
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === item.href || (item.href === '/dashboard/discover' && pathname.startsWith('/dashboard/discover')) || (item.href === '/dashboard/library' && pathname.startsWith('/dashboard/library'));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-primary/10 text-brand-primary shadow-sm'
                      : 'text-app-muted hover:bg-app-surface/80 hover:text-app-text'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-brand-primary" aria-hidden="true" />
                  )}
                  <span className={`transition-colors ${isActive ? 'text-brand-primary' : 'text-app-dim group-hover:text-app-text'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-app-dim">System</p>
          <div className="mt-2 space-y-1">
            <Link
              href="/dashboard/credits"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex h-9 items-center gap-3 rounded-xl px-3 text-xs font-medium transition-colors ${
                pathname === '/dashboard/credits'
                  ? 'bg-app-surface text-app-text'
                  : 'text-app-dim hover:bg-app-surface/60 hover:text-app-muted'
              }`}
            >
              <CreditsIcon />
              <span>Credits & Sources</span>
            </Link>
          </div>
        </div>
      </div>

      {/* User profile card */}
      <div className="space-y-3 pt-6 border-t border-app-border/70">
        <div className="flex items-center gap-3 rounded-xl bg-app-surface/60 p-2.5 border border-app-border/50">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 text-sm font-bold text-brand-primary border border-brand-primary/25">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-app-text">{displayName}</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-success" title="Synced" />
            </div>
            <div className="truncate text-[11px] text-app-dim">{userEmail}</div>
          </div>
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-app-border/70 bg-transparent py-2 text-xs font-medium text-app-dim transition-colors hover:border-brand-danger/30 hover:bg-brand-danger/10 hover:text-brand-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <SignOutIcon className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top navigation header */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-app-border/80 bg-app-bg/90 px-5 backdrop-blur-md md:hidden">
        <Logo size="sm" href="/dashboard" />
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/discover"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-app-border/70 bg-app-surface/60 text-app-muted hover:text-app-text"
            aria-label="Discover"
          >
            <DiscoverIcon className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-app-border/70 bg-app-surface/60 text-app-muted transition hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer backdrop */}
      {isMobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-app-border/80 bg-app-secondary p-6 shadow-2xl transition-transform duration-250 ease-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-app-border/70 pb-5 mb-6">
          <Logo size="sm" href="/dashboard" />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-app-dim hover:bg-app-surface hover:text-app-text"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {navContent}
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:border-r md:border-app-border/80 md:bg-app-secondary/60 md:backdrop-blur-xl md:p-6">
        <div className="border-b border-app-border/70 pb-6 mb-6">
          <Logo size="md" href="/dashboard" />
          <p className="mt-2 text-xs text-app-dim font-medium">Entertainment tracker & watch hub</p>
        </div>
        {navContent}
      </aside>
    </>
  );
}

