import React from 'react';
import Link from 'next/link';

export function CreditsView() {
  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-app-muted hover:text-app-text transition mb-4"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Kembali ke Dashboard</span>
        </Link>
        <h1 className="font-editorial text-3xl font-bold tracking-tight text-app-text sm:text-4xl">
          Atribusi & Kredit Metadata
        </h1>
        <p className="mt-2 text-sm text-app-muted">
          Vrate dibangun dengan integrasi penyedia data terbuka untuk menghadirkan informasi katalog film, serial TV, dan anime yang lengkap dan mutakhir.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* TMDB Attribution Card */}
        <div className="rounded-card border border-app-border bg-app-surface p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Official TMDB Logo (SVG) */}
            <div className="h-10 flex items-center">
              <svg
                viewBox="0 0 273.42 27.99"
                className="h-7 w-auto"
                aria-label="The Movie Database (TMDB) Logo"
              >
                <path
                  d="M6.02,2.02h6.24v23.95h-6.24V2.02z M0,2.02h18.28v4.9H0V2.02z"
                  fill="#01d277"
                />
                <path
                  d="M24.81,2.02h5.71l5.88,14.65l5.88-14.65h5.71v23.95h-4.9V8.65l-5.32,13.23h-2.73l-5.32-13.23v17.32h-4.9V2.02z"
                  fill="#01d277"
                />
                <path
                  d="M54.51,2.02h10.97c5.96,0,9.75,3.67,9.75,8.88c0,3.3-1.63,6.13-4.44,7.44l5.18,7.63h-6.13l-4.59-6.83h-5.85v6.83h-4.9V2.02z M65.23,14.21c3.16,0,5.1-1.74,5.1-4.26c0-2.52-1.94-4.26-5.1-4.26h-5.82v8.52H65.23z"
                  fill="#01d277"
                />
                <path
                  d="M80.12,2.02h10.87c7.18,0,12.01,4.9,12.01,11.98c0,7.07-4.83,11.98-12.01,11.98H80.12V2.02z M90.73,21.08c4.32,0,7.11-2.93,7.11-7.07c0-4.15-2.79-7.07-7.11-7.07h-5.71v14.15H90.73z"
                  fill="#08708a"
                />
                <path
                  d="M110.15,2.02h5.88l6.83,18.06l6.83-18.06h5.88l-9.82,23.95h-5.78L110.15,2.02z"
                  fill="#08708a"
                />
                <path
                  d="M141.22,2.02h6.24v23.95h-6.24V2.02z"
                  fill="#08708a"
                />
                <path
                  d="M153.22,2.02h18.28v4.9h-12.04v4.59h11.02v4.73h-11.02v4.83h12.04v4.9h-18.28V2.02z"
                  fill="#08708a"
                />
                <path
                  d="M185.04,14c0-7.07,4.83-11.98,12.01-11.98s12.01,4.9,12.01,11.98c0,7.07-4.83,11.98-12.01,11.98S185.04,21.08,185.04,14z M204.16,14c0-4.15-2.79-7.07-7.11-7.07s-7.11,2.93-7.11,7.07c0,4.15,2.79,7.07,7.11,7.07S204.16,18.15,204.16,14z"
                  fill="#08708a"
                />
              </svg>
            </div>

            <h3 className="text-base font-semibold text-app-text">The Movie Database (TMDB)</h3>

            <p className="text-xs text-app-muted leading-relaxed">
              Metadata film dan serial TV pada Vrate diperoleh melalui <span className="text-app-text font-medium">The Movie Database (TMDB) API</span>.
            </p>

            {/* Official TMDB Disclaimer */}
            <div className="rounded border border-app-border bg-app-elevated p-3 text-[11px] text-app-muted leading-relaxed">
              <p className="font-semibold text-app-text mb-1">Pemberitahuan Resmi TMDB:</p>
              &ldquo;This product uses the TMDB API but is not endorsed or certified by TMDB.&rdquo;
              <br />
              <span className="text-app-dim">
                (Produk ini menggunakan TMDB API tetapi tidak didukung, disponsori, atau disertifikasi oleh TMDB.)
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-app-border">
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="vr-link text-xs"
            >
              Kunjungi themoviedb.org ↗
            </a>
          </div>
        </div>

        {/* AniList Attribution Card */}
        <div className="rounded-card border border-app-border bg-app-surface p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* AniList Brand Badge */}
            <div className="h-10 flex items-center">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-[#02A9FF] flex items-center justify-center font-black text-white text-lg">
                  A
                </div>
                <span className="text-xl font-bold tracking-tight text-[#02A9FF]">AniList</span>
              </div>
            </div>

            <h3 className="text-base font-semibold text-app-text">AniList GraphQL API</h3>

            <p className="text-xs text-app-muted leading-relaxed">
              Seluruh data anime, termasuk judul Romaji/Inggris/Jepang, sinopsis, format episode, skor komunitas, dan cover art diperoleh dari <span className="text-app-text font-medium">AniList GraphQL API v2</span>.
            </p>

            <div className="rounded border border-app-border bg-app-elevated p-3 text-[11px] text-app-muted leading-relaxed">
              <p className="font-semibold text-app-text mb-1">Pemberitahuan AniList:</p>
              Metadata dan gambar anime disediakan oleh komunitas AniList. Vrate merupakan aplikasi independen dan tidak memiliki hubungan afiliasi atau kemitraan komersial langsung dengan AniList.co.
            </div>
          </div>

          <div className="pt-2 border-t border-app-border">
            <a
              href="https://anilist.co"
              target="_blank"
              rel="noopener noreferrer"
              className="vr-link text-xs"
            >
              Kunjungi anilist.co ↗
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-card border border-app-border bg-app-surface/40 p-5 text-xs text-app-dim leading-relaxed">
        <p className="font-semibold text-app-text mb-1">Hak Cipta & Kekayaan Intelektual:</p>
        Seluruh poster, gambar latar (backdrop), dan sinopsis media adalah milik masing-masing pemegang hak cipta, distributor, produsen, dan studio produksi. Vrate menyajikan materi promosi semata-mata untuk tujuan referensi dan pencatatan pribadi pengguna.
      </div>
    </div>
  );
}
