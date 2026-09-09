import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 overflow-hidden px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(360px,460px)] lg:gap-16 lg:py-10">
        <section className="hidden border-r border-app-border pr-12 lg:flex lg:flex-col lg:justify-between">
          <div>
            <Logo size="md" />
            <div className="mt-20 max-w-lg">
              <p className="vr-label">Private viewing journal</p>
              <h2 className="mt-4 text-balance text-5xl font-semibold leading-tight text-app-text">
                Masuk ke arsip tontonanmu.
              </h2>
              <p className="mt-5 text-sm leading-7 text-app-muted">
                Vrate menyimpan progres, rating, dan catatan pribadi tanpa membuat halaman auth terasa seperti panel admin.
              </p>
            </div>
          </div>

          <div className="grid max-w-sm grid-cols-3 gap-3 pb-2" aria-hidden="true">
            <div className="aspect-[2/3] border border-app-border bg-app-surface" />
            <div className="aspect-[2/3] border border-app-border bg-app-text p-3">
              <div className="h-full border border-app-bg/20" />
            </div>
            <div className="aspect-[2/3] border border-app-border bg-app-surface p-3">
              <div className="mt-auto h-full border-b-4 border-brand-primary bg-app-bg" />
            </div>
          </div>
        </section>

        <section className="flex min-h-full min-w-0 flex-col justify-center py-8">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Logo size="sm" />
            <Link href="/" className="text-sm text-app-muted transition hover:text-app-text">
              Beranda
            </Link>
          </div>

          <div className="w-full max-w-full sm:max-w-[460px] lg:ml-auto">
            <div className="border-b border-app-border pb-6">
              <p className="vr-label">Vrate account</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-app-text sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-7 text-app-muted">
                {subtitle}
              </p>
            </div>

            <div className="pt-7">{children}</div>

            {footer && (
              <div className="mt-7 border-t border-app-border pt-5 text-center text-xs text-app-dim">
                {footer}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}


