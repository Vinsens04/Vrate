import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export const metadata: Metadata = {
  title: 'Ketentuan Layanan dan Privasi - Vrate',
  description: 'Informasi Ketentuan Layanan dan Kebijakan Privasi Vrate.',
};

export default function TermsPlaceholderPage() {
  return (
    <main className="min-h-screen bg-app-bg px-5 py-8 text-app-text sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Logo size="sm" />
        <section className="mt-16 border-y border-app-border py-10">
          <p className="vr-label">Legal</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-app-text sm:text-5xl">
            Ketentuan Layanan dan Kebijakan Privasi
          </h1>
          <p className="mt-6 text-base leading-8 text-app-muted">
            Halaman ini merupakan placeholder untuk dokumen legal Vrate.
          </p>
          <p className="mt-3 text-sm leading-7 text-app-dim">
            Dokumen lengkap mengenai Terms of Service dan Privacy Policy resmi akan ditambahkan sebelum publikasi dan rilis produksi.
          </p>
          <div className="mt-8">
            <Link href="/register" className="vr-link">
              Kembali ke pendaftaran
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

