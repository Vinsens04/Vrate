import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export const metadata: Metadata = {
  title: 'Terms of Service & Privacy Policy - Vrate',
  description: 'Vrate Terms of Service and Privacy Policy information.',
};

export default function TermsPlaceholderPage() {
  return (
    <main className="min-h-screen bg-app-bg px-5 py-8 text-app-text sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Logo size="sm" />
        <section className="mt-16 border-y border-app-border py-10">
          <p className="vr-label">Legal</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-app-text sm:text-5xl">
            Terms of Service & Privacy Policy
          </h1>
          <p className="mt-6 text-base leading-8 text-app-muted">
            This page is a placeholder for Vrate legal documents.
          </p>
          <p className="mt-3 text-sm leading-7 text-app-dim">
            Complete and formal Terms of Service and Privacy Policy documentation will be published before the production release.
          </p>
          <div className="mt-8">
            <Link href="/register" className="vr-link">
              Back to registration
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

