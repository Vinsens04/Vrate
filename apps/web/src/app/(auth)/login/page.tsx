import type { Metadata } from 'next';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { isGoogleAuthEnabled } from '@/lib/supabase/config';
import { getSafeRedirectPath } from '@/features/auth/utils/safe-redirect';

export const metadata: Metadata = {
  title: 'Masuk - Vrate',
  description: 'Masuk ke akun Vrate untuk melacak film, serial, dan anime.',
};

interface LoginPageProps {
  searchParams: Promise<{
    redirectTo?: string;
    error?: string;
    message?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const safeRedirect = getSafeRedirectPath(params.redirectTo, '/dashboard');
  const googleEnabled = isGoogleAuthEnabled();

  return (
    <AuthCard
      title="Masuk"
      subtitle="Lanjutkan mencatat watchlist, episode terakhir, dan rating pribadimu."
    >
      {params.error === 'unconfigured' && (
        <div
          role="alert"
          className="mb-5 border border-brand-warning/30 bg-brand-warning/10 p-3.5 text-xs leading-relaxed text-brand-warning"
        >
          <strong className="font-semibold text-app-text">Konfigurasi Supabase belum ditemukan.</strong> Atur variabel{' '}
          <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code>{' '}
          dan anon key pada <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[11px]">apps/web/.env.local</code>.
        </div>
      )}

      {params.error === 'confirmation_failed' && (
        <div
          role="alert"
          className="mb-5 border border-brand-danger/30 bg-brand-danger/10 p-3.5 text-xs leading-relaxed text-brand-danger"
        >
          Tautan konfirmasi email tidak valid atau sudah kedaluwarsa. Coba masuk atau minta tautan baru.
        </div>
      )}

      <LoginForm redirectTo={safeRedirect} googleAuthEnabled={googleEnabled} />
    </AuthCard>
  );
}

