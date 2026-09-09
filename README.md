# Vrate — Movie, Series, & Anime Tracker

Aplikasi modern untuk melacak film, serial televisi, dan anime (Movie, Series, and Anime Tracker) dengan dukungan metadata terpadu serta integrasi Browser Extension untuk deteksi streaming.

> **Status Saat Ini: STEP 7 (Deteksi Media Browser Extension, Adapter Miruro, Generic Detector, Resolusi Metadata, & Konfirmasi Library — COMPLETED)**  
> - **Step 1:** Fondasi monorepo pnpm, tipe data bersama (`@vrate/shared`), dashboard web awal, Browser Extension Manifest V3 minimal, dan konfigurasi environment.  
> - **Step 2:** Fondasi Supabase, migration schema lengkap (8 tabel, relasi, constraint, indexes, trigger), Row Level Security (RLS) granular, SQL RLS test suite, TypeScript database types, Supabase client (browser, server SSR, admin service-role), serta validasi Zod environment.  
> - **Step 3:** Autentikasi dashboard web lengkap menggunakan Supabase Auth & Supabase SSR (Register, Login, Logout, Verifikasi Email, Lupa/Reset Password, Route Callback & Confirm, Middleware proteksi `/dashboard`, penanganan redirect aman, UI dark theme, serta opsi Google OAuth).  
> - **Step 4:** Dashboard Library & Watchlist lengkap terintegrasi ke Supabase Cloud (Dashboard Overview metrics, Library responsive grid, filter status URL searchParams, debounced search, whitelisted sorting, server-side pagination, detail page, status updater with date tracking, rating 0–10 step 0.5, favorite toggle, plain-text notes, episode progress list, watch sessions list, delete dialog, dan verifikasi RLS cross-user isolation).  
> - **Step 5:** Integrasi katalog TMDB dan AniList, client server-only terisolasi, normalisasi data, pencarian federasi multi-source (`/dashboard/discover`), filter kategori (Film, Serial, Anime), detail media (`/dashboard/discover/[provider]/[externalId]`), penambahan media ke library dengan pemilihan status awal (`watchlist`, `watching`, `completed`), deduplikasi katalog pada Supabase, isolasi hak akses admin client vs user RLS, caching terkontrol, atribusi resmi TMDB & AniList (`/dashboard/credits`), dan unit test catalog terverifikasi.  
> - **Step 6:** Autentikasi Browser Extension Manifest V3 dan koneksi aman antara extension, Supabase Cloud, dan web Vrate. Background service worker sebagai trusted auth center, custom storage adapter namespaced (`vrate.auth.*`) dengan proteksi `TRUSTED_CONTEXTS`, session restoration & token refresh otomatis tahan terminasi service worker, endpoint server-only web Bearer (`GET /api/extension/me`) dengan CORS whitelist (`EXTENSION_ALLOWED_ORIGINS`), UI popup editorial dark theme (status badge real-time, form login, navigasi web tab baru, kartu akun terhubung, tombol logout), dan unit test suite lengkap (`pnpm test:extension-auth`).  
> - **Step 7:** Deteksi media pada Browser Extension (Manifest V3 Chromium: Brave desktop, Google Chrome desktop, Microsoft Edge) dengan extensible detection engine. Adapter spesifik Miruro (`miruro.bz`) dengan ekstraksi AniList ID dan episode secara autoritatif, generic detector berbasis hierarki bukti (JSON-LD Schema.org, Open Graph, heading utama, title dokumen, URL slug), deteksi manual via `activeTab` + `scripting`, deteksi otomatis opsional Miruro via `optional_host_permissions`, deteksi SPA navigation (History API `pushState`/`replaceState`, `popstate`, dan debounced `MutationObserver`), konfirmasi pemutaran video 30 detik (`playbackConfirmed` tanpa tracking progres detik), endpoint server-only web berotentikasi Bearer (`/api/extension/media/resolve` dan `/api/extension/library`) dengan deduplikasi katalog & RLS user isolation, popup UI dengan kartu deteksi real-time & badge extension, serta suite pengujian lengkap 40 test (`pnpm test:detection`).  
>  
> *Catatan Step 7: Pelacakan progres detik video secara real-time, pembuatan watch_sessions, auto-completed 90%, tracking pause/seek, serta adapter platform streaming ber-DRM (Netflix/Disney+) secara ketat dicadangkan untuk Step 8.*

---

## Daftar Isi

- [Gambaran Aplikasi](#gambaran-aplikasi)
- [Teknologi](#teknologi)
- [Struktur Monorepo & Rute Autentikasi](#struktur-monorepo--rute-autentikasi)
- [Skema Database & Hubungan Data](#skema-database--hubungan-data)
- [Konfigurasi Supabase Auth di Dashboard Supabase](#konfigurasi-supabase-auth-di-dashboard-supabase)
- [Konfigurasi Environment Variables](#konfigurasi-environment-variables)
- [Panduan Alur Autentikasi](#panduan-alur-autentikasi)
- [Panduan Supabase & Database Workflow](#panduan-supabase--database-workflow)
- [Fitur Dashboard & Library Koleksi (Step 4)](#fitur-dashboard--library-koleksi-step-4)
- [Integrasi Katalog TMDB & AniList (Step 5)](#integrasi-katalog-tmdb--anilist-step-5)
- [Autentikasi Browser Extension & Koneksi Aman (Step 6)](#autentikasi-browser-extension--koneksi-aman-step-6)
- [Deteksi Media Browser Extension & Adapter Miruro (Step 7)](#deteksi-media-browser-extension--adapter-miruro-step-7)
- [Panduan Menjalankan Project (Windows PowerShell)](#panduan-menjalankan-project-windows-powershell)
- [Panduan Memuat Extension di Browser](#panduan-memuat-extension-di-browser)
- [Peringatan Keamanan Kredensial](#peringatan-keamanan-kredensial)

---

## Gambaran Aplikasi

Vrate dirancang sebagai platform terpadu untuk:
- **Dashboard Web:** Mengelola watchlist, riwayat tontonan, rating, dan status tontonan (movie, series, anime).
- **Browser Extension (Manifest V3):** Mendeteksi judul media yang sedang diputar di berbagai platform streaming web dan menyinkronkan ke library koleksi.
- **Dukungan Metadata Luas:** Menggabungkan TMDB untuk film & serial barat/umum, serta AniList GraphQL untuk anime series dan anime movie.
- **Dukungan Streaming:** Memungkinkan deteksi dari platform anime seperti Miruro (`miruro.bz`), serta platform streaming lainnya dengan generic detector.

---

## Teknologi

| Layer | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Package Manager** | `pnpm` (pnpm workspace) | Manajemen monorepo yang cepat dan hemat disk |
| **Web Dashboard** | `Next.js 15` (App Router), `React 19`, `TypeScript` | Server & Client components, strict mode |
| **Styling** | `Tailwind CSS 3`, `PostCSS` | Dark theme & responsive utility styling |
| **Browser Extension** | `WXT`, `React 19`, `TypeScript`, `Manifest V3` | Browser Extension untuk Brave, Chrome, & Edge dengan HMR |
| **Database & Auth** | `Supabase PostgreSQL` & `Supabase Auth` | Email/Password, PKCE SSR, cookies, RLS policies |
| **Supabase Client** | `@supabase/ssr`, `@supabase/supabase-js` | Browser client, Server SSR client, & Admin client |
| **Shared Validation**| `Zod`, `TypeScript` | Type safety & skema validasi bersama |
| **Hosting (Next Step)** | `Vercel` | Deployment cloud untuk Next.js web application |

---

## Struktur Monorepo & Rute Autentikasi

```text
Vrate/
├── apps/
│   ├── web/                                 # Next.js App Router Dashboard
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/                  # Rute Halaman Autentikasi (Step 3)
│   │   │   │   │   ├── login/page.tsx       # Halaman Masuk
│   │   │   │   │   ├── register/page.tsx    # Halaman Pendaftaran Akun
│   │   │   │   │   ├── forgot-password/page.tsx  # Permintaan Atur Ulang Sandi
│   │   │   │   │   └── reset-password/page.tsx   # Form Kata Sandi Baru
│   │   │   │   ├── auth/                    # Route Handlers
│   │   │   │   │   ├── callback/route.ts    # PKCE Code Exchange Callback
│   │   │   │   │   └── confirm/route.ts     # Email Confirmation & OTP Verification
│   │   │   │   ├── dashboard/               # Private Dashboard Routes (Step 4)
│   │   │   │   │   ├── layout.tsx           # Layout dengan Sidebar Desktop & Drawer Mobile
│   │   │   │   │   ├── loading.tsx          # Overview Skeleton
│   │   │   │   │   ├── error.tsx            # Overview Error Boundary
│   │   │   │   │   ├── page.tsx             # Overview Metrics & Resume Watching
│   │   │   │   │   └── library/             # Halaman Library Koleksi
│   │   │   │   │       ├── loading.tsx      # Grid Skeleton
│   │   │   │   │       ├── error.tsx        # Library Error Boundary
│   │   │   │   │       ├── page.tsx         # Collection Grid, Filter, Search, Sort, Pagination
│   │   │   │   │       └── [entryId]/       # Detail Media Entry
│   │   │   │   │           ├── loading.tsx  # Detail Skeleton
│   │   │   │   │           ├── not-found.tsx# Safe 404 (Not Found / Unowned)
│   │   │   │   │           ├── error.tsx    # Detail Error Boundary
│   │   │   │   │           └── page.tsx     # Status, Rating, Notes, Episodes, Delete
│   │   │   │   ├── api/
│   │   │   │   │   └── extension/
│   │   │   │   │       ├── me/route.ts      # Bearer auth profile & settings (Step 6)
│   │   │   │   │       ├── media/
│   │   │   │   │       │   └── resolve/route.ts # Metadata resolution & library status (Step 7)
│   │   │   │   │       └── library/route.ts # Add detected media to user library (Step 7)
│   │   │   │   ├── terms-placeholder/page.tsx # Dokumen Syarat & Privasi
│   │   │   │   ├── layout.tsx               # Root Layout
│   │   │   │   ├── page.tsx                 # Homepage (Tombol Masuk / Dashboard)
│   │   │   │   └── globals.css              # Global styles
│   │   │   ├── features/auth/               # Fitur Autentikasi (Step 3)
│   │   │   ├── features/library/            # Fitur Library & Watchlist (Step 4)
│   │   │   │   ├── actions/library-actions.ts # Server Actions (status, rating, fav, notes, delete)
│   │   │   │   ├── components/              # UI Components (Cards, Filters, Dialogs, Skeletons)
│   │   │   │   ├── queries/library-queries.ts # Server-only Typed Queries
│   │   │   │   └── utils/                   # Pure logic & transition rules
│   │   │   ├── features/catalog/            # Integrasi TMDB & AniList (Step 5 & 7)
│   │   │   │   ├── providers/               # TMDB & AniList clients & mappers
│   │   │   │   └── services/
│   │   │   │       └── catalog-library-service.ts # Canonical media deduplication & library insertion
│   │   │   ├── lib/supabase/                # Supabase Clients & Middleware
│   │   │   │   ├── client.ts                # Browser client (createBrowserClient)
│   │   │   │   ├── server.ts                # Server SSR client (createServerClient + cookies)
│   │   │   │   └── admin.ts                 # Service-role admin client (server-only)
│   │   │   └── middleware.ts                # Next.js 15 root middleware
│   │   └── .env.example                     # Template env khusus apps/web
│   └── extension/                           # WXT Browser Extension (Manifest V3 Chromium)
│       ├── entrypoints/
│       │   ├── background.ts                # Unified router: Auth & Media Detection (MV3 Service Worker)
│       │   ├── content.ts                   # SPA Navigation & 30s Playback Observer
│       │   └── popup/                       # Popup UI (Editorial Dark Theme)
│       │       ├── App.tsx
│       │       ├── components/
│       │       │   ├── ConnectedAccount.tsx
│       │       │   ├── LoginForm.tsx
│       │       │   └── MediaDetectionCard.tsx # Media Candidate Card & Library Actions
│       │       └── style.css
│       └── src/
│           ├── auth/                        # Storage adapter, token refresh, message client (Step 6)
│           └── detection/                   # Extensible detection engine & adapters (Step 7)
│               ├── adapters/
│               │   ├── miruro.ts            # Authoritative Miruro detector (AniList ID + ep)
│               │   └── generic.ts           # Fallback detector (JSON-LD, OG, Heading, Title)
│               ├── engine.ts                # Normalizer & detector orchestrator
│               ├── messages.ts              # Background detection handlers & badge updates
│               ├── sanitizers.ts            # Safe DOM, title cleaners, JSON-LD parser
│               └── url.ts                   # Strict HTTPS host verification & slug decoding
├── packages/
│   └── shared/                              # Shared Package (@vrate/shared)
├── supabase/
│   ├── config.toml                          # Konfigurasi Supabase CLI
│   ├── migrations/
│   │   └── 20260908153500_initial_schema.sql # Migrasi database & RLS
│   └── tests/
│       └── database_rls.test.sql            # Suite test SQL RLS
├── .env.example                             # Root environment template
├── package.json                             # Script workspace, test, & DB
└── README.md
```

---

## Skema Database & Hubungan Data

Database dirancang di schema `public` dengan PostgreSQL RLS pada setiap tabel:

| Tabel | Deskripsi | Relasi Utama | Aturan Akses RLS |
| :--- | :--- | :--- | :--- |
| `profiles` | Profil publik pengguna | `id` -> `auth.users(id)` (1:1) | User hanya bisa select/update profil miliknya. Dibuat otomatis saat user register via trigger `handle_new_user()`. |
| `media` | Katalog global bersama (film, series, anime) | - | Authenticated user hanya bisa select (read-only). Penulisan hanya via server admin / service-role. |
| `media_external_ids` | Pemetaan ID provider eksternal (TMDB / AniList) | `media_id` -> `media(id)` | Authenticated user hanya bisa select. Unique per `(provider, external_id)` dan `(media_id, provider)`. |
| `library_entries` | Entri watchlist/riwayat tontonan user | `user_id` -> `auth.users(id)`, `media_id` -> `media(id)` | User memiliki akses penuh (CRUD) hanya untuk entri miliknya (`user_id = auth.uid()`). |
| `episode_progress` | Progres per episode / anime movie | `library_entry_id` -> `library_entries(id)` | User memiliki akses (CRUD) hanya jika entri library terkait dimiliki oleh user tersebut. |
| `watch_sessions` | Sesi tontonan streaming (timestamp & durasi) | `user_id` -> `auth.users(id)`, `library_entry_id` -> `library_entries(id)` | User hanya dapat membuat dan membaca sesi miliknya dengan foreign key library yang juga miliknya. |
| `user_settings` | Preferensi deteksi otomatis & tema | `user_id` -> `auth.users(id)` (1:1) | User hanya bisa select/update pengaturan miliknya. Dibuat otomatis saat user register via trigger `handle_new_user()`. |
| `site_preferences` | Preferensi per-domain streaming (misal: `miruro.bz`) | `user_id` -> `auth.users(id)` | User memiliki akses penuh (CRUD) untuk preferensi domain miliknya. Unique per `(user_id, domain)`. |

---

## Konfigurasi Supabase Auth di Dashboard Supabase

Sebelum melakukan pengetesan runtime autentikasi, pastikan konfigurasi URL berikut diatur pada dashboard Supabase project Anda:

1. Buka dashboard project di [supabase.com/dashboard](https://supabase.com/dashboard).
2. Masuk ke menu **Authentication** > **URL Configuration**.
3. **Site URL**:
   ```text
   http://localhost:3000
   ```
4. **Redirect URLs** (Tambahkan baris-baris berikut):
   ```text
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/confirm
   http://localhost:3000/reset-password
   http://localhost:3000/dashboard
   ```
5. **Konfigurasi Email Provider**:
   - Masuk ke **Authentication** > **Providers** > **Email**.
   - Pastikan provider *Email* aktif.
   - Pilihan *Confirm email*: Jika diaktifkan, pengguna yang baru mendaftar akan menerima email konfirmasi sebelum dapat login.

---

## Konfigurasi Environment Variables

Aplikasi Next.js membaca environment variables dari `apps/web/.env.local`. Salin template environment di Windows PowerShell:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
```

Isi variabel pada file `apps/web/.env.local`:

```env
# URL dan Kunci Anon Supabase (Aman untuk Client/Browser)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Service Role Secret Key (HANYA Server-Side / Backend, Bypasses RLS)
# PERINGATAN: JANGAN PERNAH diekspos ke client bundle atau extension!
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Token TMDB API Read Access (v4) - Server-side only
TMDB_API_READ_TOKEN=

# Endpoint GraphQL Publik AniList (Bukan rahasia)
ANILIST_API_URL=https://graphql.anilist.co

# URL Aplikasi Web
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Dukungan Google OAuth Opsional (Set 'true' jika Google provider sudah dikonfigurasi)
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
```

> [!NOTE]
> `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` bernilai default `false`. Jika bernilai `false`, sistem autentikasi email/password tetap berfungsi secara normal tanpa menampilkan tombol Google yang belum siap.

---

## Panduan Alur Autentikasi

1. **Pendaftaran (Register)**:
   - Akses `/register`.
   - Masukkan email, kata sandi (min 8 karakter), konfirmasi kata sandi, dan centang persetujuan ketentuan layanan.
   - Jika *Confirm email* aktif di Supabase, Anda akan diarahkan ke layar "Periksa Email Anda". Klik tautan di email untuk mengonfirmasi.
2. **Masuk (Login)**:
   - Akses `/login`.
   - Masukkan email dan kata sandi. Setelah berhasil, Anda akan diarahkan ke `/dashboard` (atau halaman tujuan yang sebelumnya diminta melalui parameter `redirectTo`).
3. **Lupa & Reset Kata Sandi**:
   - Klik "Lupa kata sandi?" di halaman login atau akses `/forgot-password`.
   - Masukkan email. Sistem memberikan respons netral yang aman untuk mencegah *user enumeration*.
   - Buka tautan pemulihan pada email, yang akan memvalidasi token via `/auth/confirm` dan mengarahkan ke form `/reset-password`.
4. **Keluar (Logout)**:
   - Klik tombol "Keluar" pada navbar `/dashboard`. Sesi cookie dibersihkan secara aman melalui Server Action dan pengguna diarahkan ke `/login`.

---

## Panduan Supabase & Database Workflow

### 1. Menerapkan Migrasi ke Supabase Remote (Supabase Cloud)
```powershell
pnpm exec supabase login
pnpm exec supabase link --project-ref <PROJECT_REFERENCE_ID>
pnpm exec supabase db push
```

### 2. Menjalankan Supabase Lokal (Jika Docker Tersedia)
```powershell
pnpm db:start
```
Menghentikan:
```powershell
pnpm db:stop
```

### 3. Menjalankan Pengujian Unit Logika Auth
```powershell
pnpm test:auth
```
Memvalidasi skema register, deteksi ketidakcocokan password, sanitasi safe redirect, dan pemetaan pesan error Bahasa Indonesia.

### 4. Menjalankan Pengujian Unit Logika Library (Step 4)
```powershell
pnpm test:library
```
Memvalidasi transisi status tontonan (`started_at`, `completed_at`), aturan rating (0–10 kelipatan 0.5, nullable), validasi catatan (max 2.000 karakter), parsing parameter URL (filter, sort whitelist, pagination), serta mapping database view model.

---

## Fitur Dashboard & Library Koleksi (Step 4)

1. **Dashboard Overview (`/dashboard`)**:
   - Sapaan pengguna dan ringkasan metrik koleksi (*Total*, *Watchlist*, *Sedang Ditonton*, *Selesai*, *Dijeda*, *Dihentikan*).
   - Menampilkan bagian **Lanjutkan Menonton** untuk media yang berstatus `watching`.
   - Menampilkan daftar media yang terakhir diperbarui.
   - Mengambil data Supabase asli secara dinamis tanpa angka *hard-coded*.
   - Menyediakan tampilan *Empty State* jika library masih kosong.

2. **Halaman Library Koleksi (`/dashboard/library`)**:
   - Grid kartu responsif dengan poster media, status badge, rating, indikator favorit, progres episode, dan waktu tonton.
   - **Filter Status**: `Semua`, `Watchlist`, `Sedang Ditonton`, `Selesai`, `Dijeda`, `Dihentikan` yang tersinkronisasi dengan parameter URL (`?status=watching`).
   - **Pencarian Real-time**: Pencarian berbasis judul (`media.title` dan `media.original_title`) dengan *debounce* 350ms pada client (`?q=...`).
   - **Pengurutan (Sort Whitelist)**: Pilihan sort aman (`recent`, `last_watched`, `added`, `title`, `rating`, `year`) melalui parameter URL (`?sort=...`).
   - **Server-side Pagination**: Pagination default 24 entri per halaman dengan navigasi aman yang mempertahankan status filter dan query pencarian.

3. **Detail Media Entry (`/dashboard/library/[entryId]`)**:
   - Menampilkan poster/backdrop, metadata film/serial (tahun rilis, durasi, total episode), dan sinopsis.
   - Kontrol status interaktif: Transisi status dari `watchlist` ke `watching` otomatis mengisi `started_at`, dan transisi ke `completed` mengisi `completed_at`.
   - Kontrol rating pribadi: Nilai 0.0 hingga 10.0 dengan kelipatan 0.5, serta opsi menghapus rating kembali menjadi `null`.
   - Tombol toggle favorit (heart button).
   - Form catatan pribadi plain-text dengan penghitung karakter *real-time* (maksimal 2.000 karakter).
   - Riwayat progres episode dan sesi streaming jika tersedia.
   - Dialog konfirmasi hapus media dengan peringatan *cascade deletion*.
   - Penanganan rute aman: ID tidak valid atau entri milik pengguna lain menampilkan halaman 404 yang aman (`notFound()`).

---

## Integrasi Katalog TMDB & AniList (Step 5)

Pada **Step 5**, Vrate mengintegrasikan katalog metadata global dari **The Movie Database (TMDB)** dan **AniList GraphQL API**:

1. **Struktur Modul Katalog Server-Only**:
   - `apps/web/src/features/catalog/providers/tmdb/`: Client TMDB v3 dengan Bearer Token, Zod schemas, dan mappers.
   - `apps/web/src/features/catalog/providers/anilist/`: Client AniList GraphQL v2 dengan query Page & Media, Zod schemas, HTML description sanitization, dan mappers.
   - `apps/web/src/features/catalog/queries/`: Orchestrator pencarian federasi dan detail media terisolasi.
   - `apps/web/src/features/catalog/actions/`: Server Action `addToLibraryAction` untuk persistensi katalog dan penambahan ke library pengguna.
   - `apps/web/src/features/catalog/components/`: Komponen UI editorial Vrate (DiscoverView, CatalogGrid, CatalogMediaCard, CatalogSearchInput, CatalogFilterTabs, AddToLibraryModal, CreditsView).

2. **Model Media Ternormalisasi (`CatalogMedia`)**:
   UI tidak pernah bergantung pada format raw TMDB atau AniList. Kedua provider dinormalisasi menjadi satu model:
   - `provider`: `'tmdb' | 'anilist'`
   - `externalId`: ID unik provider (e.g. `157336`, `102976`)
   - `mediaType`: `'movie' | 'series'`
   - `category`: `'movie' | 'tv' | 'anime'`
   - `title`, `originalTitle`, `overview` (tersanitasi)
   - `posterUrl`, `backdropUrl` (divalidasi whitelist domain)
   - `releaseDate`, `releaseYear`, `runtimeMinutes`
   - `totalSeasons`, `totalEpisodes`, `genres`
   - `providerRating`, `providerRatingLabel` (e.g. `8.4/10 TMDB`, `84% AniList`)
   - `adult`: boolean (konten dewasa difilter)
   - `inLibrary`, `libraryEntryId`, `libraryStatus`

3. **Alur Pencarian & Debouncing (`/dashboard/discover`)**:
   - URL Route: `/dashboard/discover?q=...&source=...&type=...&page=...`
   - Pencarian otomatis berjalan dengan debounce 350ms atau penekanan tombol Enter.
   - Menggunakan `AbortController` untuk membatalkan request lama saat pengguna terus mengetik.
   - Filter Kategori: `Semua`, `Film`, `Serial`, `Anime`.
   - Filter Provider: `Semua`, `TMDB`, `AniList`.
   - Menampilkan status *"Sudah di Library"* secara langsung jika media tersebut sudah ada di library pengguna yang sedang login.

4. **Alur Penambahan ke Library & Pemilihan Status Awal**:
   - Menggunakan Server Action `addToLibraryAction`.
   - Client hanya mengirim `provider`, `externalId`, `providerMediaType`, dan `initialStatus`.
   - Metadata diambil langsung dari provider di server (tidak mempercayai input title/poster dari browser).
   - Status awal yang didukung:
     - `watchlist`: `started_at = null`, `completed_at = null`
     - `watching`: `started_at = now()`, `completed_at = null`
     - `completed`: `started_at = now()`, `completed_at = now()`

5. **Deduplikasi Katalog & Isolasi Hak Akses Admin Client**:
   - Entri katalog global `media` dan `media_external_ids` hanya dapat ditulis oleh modul server-only menggunakan `createAdminClient()`.
   - Alur deduplikasi:
     1. Cari `(provider, external_id)` pada `media_external_ids`.
     2. Jika sudah ada, gunakan `media_id` yang tersimpan (tidak membuat duplikat media).
     3. Jika belum ada, buat record baru di `media` dan mapping di `media_external_ids`.
     4. Menangani race condition konkurensi dengan penangkapan kode unik PostgreSQL `23505`.
   - Library pengguna (`library_entries`) **wajib** dibuat menggunakan user Supabase client berotentikasi (`createClient()`) sehingga Row Level Security (RLS) tetap aktif dan terisolasi per user.

6. **Strategi Caching & Ketahanan Upstream (Reliability)**:
   - Pencarian: Cache Next.js `revalidate: 300` (5 menit).
   - Detail Media: Cache Next.js `revalidate: 86400` (24 jam).
   - Timeout request: 8 detik dengan `AbortSignal.timeout(8000)`.
   - Retry terbatas: Maksimal 2 percobaan untuk status 429 atau 5xx.
   - Penanganan parsial: Jika salah satu provider mengalami gangguan (seperti downtime atau rate limit), provider lain tetap memberikan hasil pencarian dan UI menampilkan peringatan parsial tanpa merusak pengalaman pengguna.

7. **Konfigurasi Gambar Next Image & Keamanan Host**:
   - Konfigurasi `images.remotePatterns` pada [`apps/web/next.config.ts`](file:///C:/laragon/www/Vrate/apps/web/next.config.ts) dikonfigurasi ketat hanya untuk:
     - `image.tmdb.org`
     - `s4.anilist.co`
     - `img.anilist.co`
   - Fungsi validator `isAllowedImageUrl()` memastikan tidak ada URL eksternal berbahaya yang diteruskan ke komponen `<Image />`.
   - Jika poster bernilai null atau URL tidak valid, Vrate merender fallback visual yang elegan.

8. **Atribusi & Kredit Metadata (`/dashboard/credits`)**:
   - TMDB: Menampilkan logo resmi TMDB dan pemberitahuan resmi bahwa Vrate menggunakan API TMDB tetapi tidak didukung/disertifikasi oleh TMDB.
   - AniList: Menampilkan atribusi bahwa data anime bersumber dari AniList GraphQL API beserta tautan resmi ke AniList.co.

---

## Panduan Konfigurasi TMDB API Read Access Token

Jika Anda ingin mengaktifkan pencarian film dan serial dari TMDB:

1. Buat akun di [The Movie Database (TMDB)](https://www.themoviedb.org/).
2. Masuk ke menu **Settings** > **API** (`https://www.themoviedb.org/settings/api`).
3. Buat permohonan API key (pilih opsi Developer / Personal).
4. Salin **API Read Access Token** (token v4 Bearer yang panjang).
5. Tambahkan token tersebut langsung ke file `apps/web/.env.local`:
   ```env
   TMDB_API_READ_TOKEN=your_v4_read_access_token_here
   ```
6. Simpan file. Jalankan `pnpm dev:web` atau `pnpm build`.

> [!IMPORTANT]
> - `TMDB_API_READ_TOKEN` bersifat rahasia dan hanya digunakan di server-side Next.js.
> - **JANGAN PERNAH** membagikan atau mengirimkan token ini melalui chat publik atau menyertakannya dalam commit Git.
> - Jika token belum diisi, Vrate tetap berjalan normal dan pencarian anime AniList tetap aktif, sementara UI menampilkan notifikasi bahwa TMDB belum terhubung.

---

## Autentikasi Browser Extension & Koneksi Aman (Step 6)

Pada **Step 6**, Vrate menyediakan autentikasi mandiri pada Browser Extension Manifest V3 (Chromium) serta koneksi aman ke Supabase Cloud dan web Vrate:

### 1. Arsitektur Autentikasi Extension
- **Background Service Worker sebagai Trusted Auth Center**: Background worker mengelola lifecycle Supabase client, sesi login, auto-refresh token, dan listener pesan runtime `chrome.runtime.onMessage`.
- **Custom Storage Adapter**: Sesi Supabase disimpan di `chrome.storage.local` dengan prefix aman `vrate.auth.*`.
- **Isolasi Hak Akses Storage MV3**: Menggunakan `chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })` untuk mencegah content script yang disuntikkan ke halaman web membaca data token atau kredensial.
- **Pembersihan Parsial Sesi (`clearVrateAuthStorage`)**: Saat logout atau sesi kedaluwarsa, ekstensi hanya menghapus kunci dengan prefix `vrate.auth.*` dan tidak pernah memanggil `chrome.storage.local.clear()`, sehingga preferensi lain tetap aman.
- **Pencegahan Akses Content Script**: Listener pesan runtime memvalidasi `sender.tab`. Permintaan yang berasal dari tab halaman web otomatis ditolak untuk menjaga integritas operasi autentikasi.

### 2. Ketahanan Lifecycle Service Worker & Pemulihan Sesi
- Sesi pengguna tetap tersimpan saat popup ditutup dan saat service worker dihentikan secara idle oleh browser.
- Saat popup dibuka kembali, pesan `AUTH_GET_STATE` dikirim ke background worker. Background mengecek sesi yang tersimpan dan secara otomatis melakukan refresh jika token mendekati waktu kedaluwarsa (< 30 detik).
- Jika perangkat offline atau jaringan terputus, ekstensi menampilkan status `offline` dengan tombol "Coba Lagi" tanpa menghapus sesi lokal.

### 3. Tampilan Popup Ekstensi (Editorial Dark Theme)
- **Ukuran & Tema Konsisten**: Lebar 360px dengan warna latar `#0A0A0A`, aksen oranye `#FF5C35`, dan tipografi bersih yang selaras dengan web dashboard Vrate.
- **Indikator Status Real-time**: Badge dinamis menunjukkan status: `Terhubung` (hijau), `Belum Masuk` (oranye/merah), `Memeriksa...` (abu-abu), `Offline`, atau `Sesi Berakhir`.
- **Form Login Mandiri**: Input email dan password dengan toggle lihat/sembunyikan kata sandi. Kredensial tidak pernah dicatat atau dicetak ke log.
- **Navigasi Web Aman**: Tautan "Daftar sekarang" (`/register?source=extension`) dan "Lupa kata sandi?" (`/forgot-password?source=extension`) membuka tab browser baru via pesan runtime `OPEN_URL`.
- **Identitas Akun Terhubung**: Saat login berhasil, popup menampilkan inisial/avatar pengguna, nama profil, email, dan status sinkronisasi.
- **Tombol Aksi**:
  - *"Buka Dashboard"*: Membuka tab baru ke rute `/dashboard`.
  - *"Keluar dari Ekstensi"*: Menghapus sesi Supabase pada extension tanpa memengaruhi sesi login yang sedang aktif di browser web.

### 4. Endpoint Web Server-Only (`GET /api/extension/me`)
- **Validasi Bearer Token**: Endpoint membaca header `Authorization: Bearer <token>`, memvalidasi format dan panjang header (maks 2.048 karakter), serta memverifikasi keabsahan token secara kriptografis melalui Supabase Auth server.
- **User-Scoped Client & RLS**: Setelah token terverifikasi, query ke tabel `profiles` dan `user_settings` dijalankan menggunakan Supabase client berotentikasi user (bukan service role) sehingga aturan Row Level Security (RLS) tetap aktif penuh.
- **Perlindungan CORS Terbatas (`EXTENSION_ALLOWED_ORIGINS`)**:
  - Whitelist origin spesifik (misal: `chrome-extension://<id>`).
  - Mengembalikan header `Access-Control-Allow-Origin` yang mencocokkan origin terdaftar (bukan wildcard `*`).
  - Mendukung preflight `OPTIONS` (status 204) dan menolak origin mencurigakan (status 403).
  - Menyertakan header `Vary: Origin` dan anti-caching `Cache-Control: no-store, no-cache, must-revalidate`.

---

## Deteksi Media Browser Extension & Adapter Miruro (Step 7)

Pada **Step 7**, Vrate menghadirkan modul pendeteksian media tontonan pada Browser Extension (Manifest V3 Chromium: Brave desktop, Google Chrome desktop, Microsoft Edge) dengan arsitektur mesin deteksi yang dapat diperluas (*extensible detection engine*), adapter platform streaming Miruro (`miruro.bz`), generic detector fallback, resolusi metadata server-side, serta alur konfirmasi penambahan ke library koleksi.

### 1. Arsitektur Mesin Deteksi (*Extensible Detection Engine*)
- **Modular Adapter Pattern**: Mengimplementasikan kontrak interface `MediaDetectorAdapter` dengan method `matches(url)` dan `detect(context)`.
- **Prioritas Adapter**:
  1. Adapter spesifik domain (e.g. `MiruroAdapter` untuk `miruro.bz` dan `www.miruro.bz`).
  2. Generic detector fallback (`GenericMediaDetector`) untuk platform streaming berbasis web lainnya.
- **Normalisasi Kandidat**: Hasil deteksi dinormalisasi menjadi objek `DetectedMediaCandidate` dengan skema validasi Zod:
  - `provider`: `'anilist' | 'tmdb' | 'unknown'`
  - `externalId`: ID resmi dari provider jika tersedia secara autoritatif (string numerik positif) atau `null`.
  - `mediaType`: `'anime' | 'movie' | 'series'`
  - `title`: Judul media yang telah dibersihkan dari noise web streaming.
  - `episodeNumber`: Nomor episode yang terdeteksi (opsional, integer positif).
  - `seasonNumber`: Nomor season jika terdeteksi (opsional).
  - `confidence`: Skor keyakinan deteksi (0.00 hingga 1.00).
  - `evidence`: Bukti yang mendasari deteksi (`'url_pattern'`, `'json_ld'`, `'open_graph'`, `'dom_heading'`, `'page_title'`, `'url_slug'`).
  - `sourceUrl`: URL halaman asal pemutaran media.
  - `playbackConfirmed`: Boolean penanda apakah pemutaran video telah berlangsung minimal 30 detik.

### 2. Adapter Spesifik Miruro (`miruro.bz`)
- **Validasi Host Ketat**: Hanya menerima hostname persis `miruro.bz` dan `www.miruro.bz` dengan protokol `https:`. Domain attacker seperti `miruro.bz.attacker.com` atau `evilmiruro.bz` ditolak secara ketat.
- **Pola URL Autoritatif**: Membaca URL dengan pola `/watch/:id` di mana `:id` adalah AniList ID anime (misal: `https://www.miruro.bz/watch/102976?ep=1`).
- **Ekstraksi ID & Episode**:
  - `provider`: `'anilist'`
  - `externalId`: ID numerik dari URL (e.g. `'102976'`), langsung dipetakan sebagai AniList ID autoritatif.
  - `episodeNumber`: Diambil dari query parameter `?ep=N` sebagai positive integer (e.g. `1`).
  - `confidence`: **0.98** (sangat tinggi karena ID berasal dari schema URL platform).
- **Slug Decoding**: Jika judul DOM belum ter-render, slug URL di-decode dan diformat otomatis (e.g. `kimetsu-no-yaiba` -> `Kimetsu No Yaiba`).

### 3. Generic Metadata Detector
- Bekerja secara otomatis sebagai fallback untuk domain streaming web apa pun yang tidak memiliki adapter spesifik.
- **Hierarki Ekstraksi Bukti**:
  1. **JSON-LD Schema.org**: Membaca `<script type="application/ld+json">` untuk schema `Movie`, `TVSeries`, `TVEpisode`, atau `VideoObject`. Diparsing secara defensif dengan batas ukuran 64KB dan tanpa mengeksekusi script.
  2. **Open Graph**: Mengambil `og:title`, `og:image`, `og:type`, dan `og:description`.
  3. **Heading Utama DOM**: Mengambil teks dari elemen `<h1>` yang merepresentasikan judul konten.
  4. **Document Title**: Mengambil `<title>` dokumen.
  5. **URL Slug**: Mengekstrak segmen path URL yang relevan sebagai fallback terakhir.
- **Sanitasi Judul**: Menghilangkan noise streaming umum seperti *"Watch"*, *"Nonton"*, *"Streaming"*, *"Sub Indo"*, *"English Sub"*, *"1080p"*, *"Episode 01"*, tanpa memotong judul asli karya (misal: tetap mempertahankan judul asli seperti *"Watchmen"*).
- **Atribut Hasil**: `provider = 'unknown'`, `externalId = null`, dengan confidence score antara `0.60` hingga `0.85` tergantung kelengkapan evidence yang ditemukan.

### 4. Kebijakan Perizinan & Privasi Browser Extension
Vrate mematuhi prinsip *Least Privilege* Manifest V3:
- **Izin Standar (Tanpa Broad Host Permissions)**:
  - `permissions: ['activeTab', 'storage', 'scripting']`
  - `host_permissions: ['http://localhost:3000/*', '<supabase-project-url>/*']`
  - **TIDAK ADA** izin `<all_urls>` atau `*://*/*`.
- **Deteksi Manual (Default)**:
  - Bekerja menggunakan izin `activeTab` dan `scripting.executeScript`.
  - Content script hanya disuntikkan secara on-demand saat pengguna membuka popup dan menekan tombol *"Deteksi Media di Tab Ini"*.
- **Deteksi Otomatis Opsional untuk Miruro**:
  - Didaftarkan sebagai `optional_host_permissions: ['https://miruro.bz/*', 'https://www.miruro.bz/*']`.
  - Pengguna dapat mengaktifkan toggle *"Deteksi Otomatis Miruro"* di popup ekstensi.
  - Ekstensi memanggil API resmi `chrome.permissions.request`. Jika disetujui, background service worker mendaftarkan dynamic content script (`vrate-miruro-detector`) via `chrome.scripting.registerContentScripts`.
  - Toggle dapat dimatikan kapan saja, yang memanggil `chrome.permissions.remove` dan `unregisterContentScripts`.
- **Data yang Dibaca vs Data yang TIDAK Dibaca**:
  - **Data yang dibaca**: URL tab saat ini, judul halaman (`<title>`), meta Open Graph, heading `<h1>`, script JSON-LD publik, serta event status elemen `<video>` HTML5.
  - **Data yang TIDAK dibaca**: Riwayat penelusuran umum, cookie situs streaming, kredensial akun pihak ketiga, percakapan/chat, binary file streaming video, dan kunci DRM.

### 5. Pengamatan Navigasi Single Page Application (SPA)
Situs streaming modern umumnya adalah SPA yang berpindah episode atau judul tanpa melakukan reload halaman:
- Content script memonitor navigasi via pengaitan (*monkey patching*) fungsi `history.pushState` dan `history.replaceState`, serta event listener `popstate`.
- Dilengkapi `MutationObserver` dengan teknik *debounce* 750ms untuk mendeteksi pembaruan DOM dinamis (perubahan judul atau player video).
- Menggunakan kalkulasi sidik jari (*fingerprint hash*) `${url}|${title}|${episodeNumber}` untuk mencegah pengiriman pesan duplikat ke background service worker saat DOM bermutasi berulang.

### 6. Konfirmasi Pemutaran Video 30 Detik (`playbackConfirmed`)
- Content script mengamati event `timeupdate` dan `playing` pada elemen `<video>` HTML5 di halaman.
- Setelah pemutaran video berjalan kumulatif minimal 30 detik, kandidat deteksi ditandai dengan `playbackConfirmed: true`.
- **Batasan Ketat Step 7**: Pada tahap ini, ekstensi **TIDAK** melacak detik progres berjalan, **TIDAK** mencatat `watch_sessions`, dan **TIDAK** melakukan auto-completion 90%. Fitur pelacakan progres tontonan tersebut dijadwalkan secara ketat pada **Step 8**.

### 7. Endpoint Resolusi Metadata Server-Side (`POST /api/extension/media/resolve`)
- Dilindungi oleh verifikasi Bearer token Supabase Auth via header `Authorization`.
- Menerima payload kandidat dari ekstensi dan mencari metadata kanonikal:
  - **AniList ID**: Jika kandidat memiliki ID dari Miruro (misal `102976`), query GraphQL AniList langsung dijalankan untuk memperoleh detail lengkap (judul, poster, sinopsis, episode, rating).
  - **TMDB**: Jika provider adalah TMDB, detail diambil via TMDB client.
  - **Generic / Unknown**: Melakukan federated search berbasis judul dan tipe media untuk menghasilkan hingga 5 kandidat resolusi teratas.
- Memeriksa status entri library milik pengguna yang sedang login (`inLibrary: boolean`, `libraryEntryId`, `libraryStatus`).
- **Resiliensi Upstream**: Jika terjadi kendala jaringan atau kegagalan upstream AniList/TMDB, API mengembalikan respons JSON terstruktur dengan kode error yang jelas tanpa menyebabkan HTTP 500 fatal crash.

### 8. Endpoint Penambahan ke Library (`POST /api/extension/library`)
- Dilindungi oleh verifikasi Bearer token Supabase Auth.
- Menggunakan service server-only [`catalog-library-service.ts`](file:///C:/laragon/www/Vrate/apps/web/src/features/catalog/services/catalog-library-service.ts):
  1. `ensureCanonicalMedia`: Memastikan rekaman metadata tersimpan di tabel `media` dan `media_external_ids` menggunakan service-role admin client (mencegah duplikasi data katalog global).
  2. `addMediaToUserLibrary`: Menyisipkan entri ke tabel `library_entries` menggunakan user Supabase client berotentikasi, sehingga isolasi Row Level Security (RLS) tetap terjamin penuh.
- Mendukung pilihan status awal: `watchlist`, `watching` (otomatis mencatat `started_at`), atau `completed` (mencatat `started_at` dan `completed_at`).

### 9. Antarmuka Popup Ekstensi (Editorial Dark Theme)
- **Status Deteksi Real-Time**: Menampilkan kartu deteksi yang menginformasikan judul media, badge provider (AniList / TMDB / Web Generic), badge episode, poster thumbnail, dan confidence bar.
- **Indikator Keberadaan di Library**: Jika media sudah tersimpan di koleksi pengguna, kartu menampilkan badge *"Sudah di Library"* berserta status saat ini (`Sedang Ditonton`, `Watchlist`, atau `Selesai`).
- **Aksi Cepat**: Tombol *"+ Watchlist"* dan *"+ Sedang Ditonton"* yang langsung menyinkronkan media ke akun Vrate pengguna tanpa perlu membuka dashboard web.
- **Pilihan Kandidat Alternatif**: Untuk generic detector, popup menyajikan dropdown/daftar kandidat metadata yang dapat dipilih pengguna jika terdapat beberapa judul serupa.
- **Aksi "Bukan Ini"**: Tombol penolakan untuk mengabaikan deteksi yang keliru dan membersihkan badge ekstensi.
- **Badge Ekstensi Dinamis**: Mengubah badge browser extension menjadi oranye (`#FF5C35`) dengan label `"!"` saat media streaming terdeteksi di tab aktif.

### 10. Keterbatasan Teknis Cross-Origin iframe
Banyak situs pemutar streaming menyematkan video player di dalam `<iframe>` yang berasal dari domain berbeda (*cross-origin*). Karena kebijakan keamanan browser *Same-Origin Policy* (SOP):
- Ekstensi tidak dapat membaca DOM atau event video di dalam iframe cross-origin tanpa izin khusus ke origin penyedia video player tersebut.
- Solusi elegan Vrate: Ekstensi mengekstrak metadata secara andal dari halaman induk (*parent page*), judul halaman, heading, dan parameter URL, sehingga deteksi judul dan episode anime tetap akurat meskipun video player berada di dalam iframe pihak ketiga.

### 5. Konfigurasi Environment Extension (`apps/extension/.env.local`)
Salin file template pada `apps/extension`:
```powershell
Copy-Item apps/extension/.env.example apps/extension/.env.local
```
Isi variabel publik Supabase:
```env
WXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
WXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
WXT_PUBLIC_WEB_APP_URL=http://localhost:3000
```

### 6. Mendaftarkan Extension ID pada Web Dashboard
1. Muat extension di `chrome://extensions` (lihat panduan di bawah).
2. Salin ID extension dari kartu extension (misalnya: `abcdefghijklmnopabcdefghijklmnop`).
3. Tambahkan ke `apps/web/.env.local`:
   ```env
   EXTENSION_ALLOWED_ORIGINS=chrome-extension://abcdefghijklmnopabcdefghijklmnop
   ```
4. Restart web server (`pnpm dev:web`).

---

## Panduan Menjalankan Project (Windows PowerShell)

Semua script dijalankan dari root directory `C:\laragon\www\Vrate`:

### Menjalankan Seluruh Dev Server (Web & Extension)
```powershell
pnpm dev
```

### Menjalankan Dashboard Web Saja
```powershell
pnpm dev:web
```
Aplikasi web dapat diakses di browser melalui: `http://localhost:3000`

### Menjalankan Extension dalam Mode Development (WXT)
```powershell
pnpm dev:extension
```

### Memeriksa Tipe Data (Typecheck)
```powershell
pnpm typecheck
```

### Memeriksa Format Kode (Lint)
```powershell
pnpm lint
```

### Menjalankan Unit Tests Autentikasi
```powershell
pnpm test:auth
```

### Menjalankan Unit Tests Library & Watchlist
```powershell
pnpm test:library
```

### Menjalankan Unit Tests Katalog TMDB & AniList (Step 5)
```powershell
pnpm test:catalog
```

### Menjalankan Unit Tests Autentikasi Extension & Koneksi Aman (Step 6)
```powershell
pnpm test:extension-auth
```

### Menjalankan Unit Tests Deteksi Media & API Resolusi (Step 7)
```powershell
pnpm test:detection
```
Menjalankan 40 unit test yang mencakup:
- Ekstraksi Miruro adapter (AniList ID, episode parsing, slug decoding, URL strictness).
- Generic metadata detector (JSON-LD Schema.org, Open Graph, DOM headings, title cleaning).
- Sanitizer defensif (pencegahan script injection, batas 64KB JSON-LD, pembersihan noise kata kunci streaming).
- Background message router & origin validation (penolakan akses tab liar).
- Dynamic content script registration deduplication.
- Web API resolution (`POST /api/extension/media/resolve`) dengan Bearer auth, resolusi AniList/TMDB/Generic, status library user, dan resiliensi upstream.
- Web API library insertion (`POST /api/extension/library`) dengan deduplikasi canonical media dan PostgreSQL RLS isolation.
- Verifikasi ketat ketiadaan tracking detik video atau pembuatan `watch_sessions` di Step 7.

### Membangun Seluruh Project untuk Produksi
```powershell
pnpm build
```

---

## Panduan Memuat Extension di Browser

Ekstensi Vrate dibangun dengan target **Manifest V3 / Chromium** yang kompatibel dengan browser desktop berbasis Chromium:
- **Brave desktop** (Target Utama)
- **Google Chrome desktop** (Target Utama)
- **Microsoft Edge** (Target Kompatibilitas)

### Langkah Pemasangan:

1. Bangun extension dari root repository:
   ```powershell
   pnpm --filter @vrate/extension build
   ```
   Folder keluaran build akan berada di:
   ```text
   C:\laragon\www\Vrate\apps\extension\.output\chrome-mv3
   ```

2. Buka halaman ekstensi pada browser pilihan Anda:
   - **Brave**: Buka URL `brave://extensions`
   - **Google Chrome**: Buka URL `chrome://extensions`
   - **Microsoft Edge**: Buka URL `edge://extensions`

3. Aktifkan toggle **"Developer mode"** (Mode Pengembang) di pojok kanan atas (atau panel kiri di Edge).

4. Klik tombol **"Load unpacked"** (Muat yang belum dibongkar) di bagian kiri atas.

5. Pilih folder output build ekstensi:
   ```text
   C:\laragon\www\Vrate\apps\extension\.output\chrome-mv3
   ```

6. Ikon Vrate Browser Extension akan muncul di toolbar browser Anda. Klik ikon pin untuk menyematkan ekstensi agar mudah diakses.

---

## Peringatan Keamanan Kredensial

> [!CAUTION]
> - **`SUPABASE_SERVICE_ROLE_KEY`** memiliki hak akses penuh untuk melewati (bypass) Row Level Security (RLS). Kunci ini **TIDAK BOLEH** pernah dikirimkan ke browser, client components, atau Browser Extension bundle.
> - Kunci service-role hanya dapat diakses melalui modul server-only di [`apps/web/src/lib/supabase/admin.ts`](file:///C:/laragon/www/Vrate/apps/web/src/lib/supabase/admin.ts).
> - File `.env.local` telah dimasukkan ke dalam [`.gitignore`](file:///C:/laragon/www/Vrate/.gitignore) dan tidak boleh di-commit ke Git.
#   V r a t e  
 