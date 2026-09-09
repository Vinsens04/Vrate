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

function OverviewIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5h16M4 12h10M4 17.5h16" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.75h12v14.5H6zM9 4.75v14.5M15 4.75v14.5" />
    </svg>
  );
}

function DiscoverIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CreditsIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function DashboardNav({ userEmail, displayName }: DashboardNavProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: <OverviewIcon /> },
    { href: '/dashboard/library', label: 'Library', icon: <LibraryIcon /> },
    { href: '/dashboard/discover', label: 'Temukan', icon: <DiscoverIcon /> },
  ];

  const userInitial = displayName.charAt(0).toUpperCase();

  const navContent = (
    <>
      <nav className="mt-8 flex-1 space-y-1" aria-label="Navigasi dashboard">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href === '/dashboard/discover' && pathname.startsWith('/dashboard/discover'));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex min-h-[44px] items-center gap-3 border-l-2 px-4 text-sm font-medium transition ${
                isActive
                  ? 'border-brand-primary bg-app-surface text-app-text'
                  : 'border-transparent text-app-muted hover:border-app-border hover:bg-app-surface hover:text-app-text'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-app-border pt-4">
        <div className="mb-4">
          <Link
            href="/dashboard/credits"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2 px-1 text-xs text-app-dim hover:text-app-muted transition"
          >
            <CreditsIcon />
            <span>Kredit & Atribusi</span>
          </Link>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-app-border bg-app-surface text-sm font-semibold text-app-text">
            {userInitial}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-app-text">{displayName}</div>
            <div className="truncate text-xs text-app-dim">{userEmail}</div>
          </div>
        </div>

        <form action={signOutAction}>
          <button type="submit" className="vr-secondary w-full min-h-[40px] px-4 py-2 text-xs">
            Keluar
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-app-border bg-app-bg/95 px-4 md:hidden">
        <Logo size="sm" href="/dashboard" />
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-btn border border-app-border text-app-muted transition hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          aria-label={isMobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
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
      </header>

      {isMobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Tutup menu navigasi"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82vw] flex-col border-r border-app-border bg-app-bg p-5 transition-transform duration-200 md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-app-border pb-5">
          <Logo size="sm" href="/dashboard" />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-app-muted hover:text-app-text"
            aria-label="Tutup menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {navContent}
      </div>

      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-60 md:flex-col md:border-r md:border-app-border md:bg-app-bg md:p-5">
        <div className="border-b border-app-border pb-6">
          <Logo size="md" href="/dashboard" />
          <p className="mt-3 text-xs leading-5 text-app-dim">Catat yang kamu tonton.</p>
        </div>
        {navContent}
      </aside>
    </>
  );
}

