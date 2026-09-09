import Link from 'next/link';

export default function LibraryEntryNotFound() {
  return (
    <div className="border-y border-app-border py-12 text-center">
      <p className="font-editorial text-5xl text-brand-primary" aria-hidden="true">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-app-text">Media tidak ditemukan.</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-app-muted">
        Media yang kamu cari tidak ditemukan atau tidak tersedia dalam library akun ini.
      </p>
      <div className="mt-7">
        <Link href="/dashboard/library" className="vr-primary">
          Kembali ke library
        </Link>
      </div>
    </div>
  );
}

