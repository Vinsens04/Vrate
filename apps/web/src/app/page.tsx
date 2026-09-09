import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/brand/Logo';

const steps = [
  {
    number: '01',
    title: 'Simpan',
    body: 'Tambahkan tontonan yang ingin kamu lihat, tanpa harus mengingatnya di aplikasi lain.',
  },
  {
    number: '02',
    title: 'Lanjutkan',
    body: 'Temukan kembali episode, status, dan progres terakhir saat kamu kembali menonton.',
  },
  {
    number: '03',
    title: 'Ingat',
    body: 'Beri rating dan simpan catatan pribadi setelah selesai, seperti jurnal tontonan.',
  },
];

export default async function HomePage() {
  let user = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <header className="sticky top-0 z-40 border-b border-app-border bg-app-bg/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Logo size="md" />

          <nav className="hidden items-center gap-8 md:flex" aria-label="Navigasi utama">
            <a href="#tentang" className="text-sm text-app-muted transition hover:text-app-text">
              Tentang
            </a>
            <a href="#cara-kerja" className="text-sm text-app-muted transition hover:text-app-text">
              Cara Kerja
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <Link href="/dashboard" className="vr-primary">
                Buka Library
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden text-sm font-medium text-app-muted transition hover:text-app-text sm:inline-flex">
                  Masuk
                </Link>
                <Link href="/register" className="vr-primary">
                  Mulai
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section id="tentang" className="overflow-hidden border-b border-app-border">
          <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:py-20">
            <div className="min-w-0 max-w-3xl">
              <p className="vr-label">Vrate / Personal viewing log</p>
              <h1 className="mt-5 max-w-full text-balance text-5xl font-semibold leading-[0.98] text-app-text sm:text-7xl lg:text-8xl">
                Catat yang kamu tonton.
              </h1>
              <p className="mt-7 max-w-full text-base leading-8 text-app-muted sm:text-lg">
                Satu tempat untuk menyimpan film, serial, dan anime beserta progres, rating, dan catatan pribadimu.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href={user ? '/dashboard' : '/register'} className="vr-primary w-full sm:w-auto">
                  {user ? 'Buka Library' : 'Mulai mencatat'}
                </Link>
                {!user && (
                  <Link href="/login" className="vr-secondary w-full sm:w-auto">
                    Masuk
                  </Link>
                )}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-full overflow-hidden sm:max-w-[440px] lg:mx-0" aria-hidden="true">
              <div className="absolute -left-8 top-8 hidden h-[86%] w-px bg-app-border lg:block" />
              <div className="grid grid-cols-[0.82fr_1fr_0.74fr] items-end gap-3">
                <div className="space-y-3 pb-10">
                  <div className="aspect-[2/3] border border-app-border bg-app-surface p-3">
                    <div className="h-full border border-app-border-subtle bg-app-elevated" />
                  </div>
                  <p className="vr-label">Watchlist</p>
                </div>
                <div className="space-y-3">
                  <div className="aspect-[2/3] border border-app-border bg-app-text p-3 text-app-bg">
                    <div className="flex h-full flex-col justify-between border border-app-bg/20 p-4">
                      <span className="text-[11px] font-semibold uppercase text-app-bg/60">Catatan</span>
                      <div>
                        <div className="h-px w-14 bg-brand-primary" />
                        <div className="mt-4 space-y-2">
                          <div className="h-2 w-20 bg-app-bg/70" />
                          <div className="h-2 w-28 bg-app-bg/30" />
                          <div className="h-2 w-16 bg-app-bg/30" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="vr-label text-right">Private archive</p>
                </div>
                <div className="space-y-3 pb-20">
                  <div className="aspect-[2/3] border border-app-border bg-app-surface p-3">
                    <div className="flex h-full flex-col justify-end gap-3 bg-app-bg p-4">
                      <div className="h-1.5 w-full bg-app-border">
                        <div className="h-full w-2/3 bg-brand-primary" />
                      </div>
                      <span className="text-[11px] font-semibold uppercase text-app-dim">Episode</span>
                    </div>
                  </div>
                  <p className="vr-label">Progress</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="cara-kerja" className="border-b border-app-border px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
              <div>
                <p className="vr-label">Cara Kerja</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight text-app-text sm:text-4xl">
                  Arsip kecil untuk tontonan yang panjang.
                </h2>
              </div>
              <div className="divide-y divide-app-border border-y border-app-border">
                {steps.map(step => (
                  <div key={step.number} className="grid gap-4 py-7 sm:grid-cols-[96px_180px_1fr] sm:items-baseline">
                    <span className="font-editorial text-3xl text-brand-primary">{step.number}</span>
                    <h3 className="text-xl font-semibold text-app-text">{step.title}</h3>
                    <p className="max-w-xl text-sm leading-7 text-app-muted">{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-14 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 border-b border-app-border pb-14 sm:flex-row sm:items-end">
            <div>
              <p className="vr-label">Vrate</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-app-text sm:text-5xl">
                Library pribadi yang tetap tenang saat datanya masih kosong.
              </h2>
            </div>
            <Link href={user ? '/dashboard' : '/register'} className="vr-primary w-full sm:w-auto">
              {user ? 'Buka Library' : 'Mulai mencatat'}
            </Link>
          </div>
        </section>
      </main>

      <footer className="px-5 pb-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-app-dim sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Logo size="sm" isLink={false} />
            <span>Catat yang kamu tonton.</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/terms-placeholder" className="hover:text-app-text">
              Terms
            </Link>
            <Link href="/terms-placeholder" className="hover:text-app-text">
              Privacy
            </Link>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
