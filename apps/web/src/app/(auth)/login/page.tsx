import type { Metadata } from 'next';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { isGoogleAuthEnabled } from '@/lib/supabase/config';
import { getSafeRedirectPath } from '@/features/auth/utils/safe-redirect';

export const metadata: Metadata = {
  title: 'Sign In - Vrate',
  description: 'Sign in to your Vrate account to track movies, series, and anime.',
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
      title="Sign In"
      subtitle="Continue tracking your watchlist, last watched episodes, and personal ratings."
    >
      {params.error === 'unconfigured' && (
        <div
          role="alert"
          className="mb-5 border border-brand-warning/30 bg-brand-warning/10 p-3.5 text-xs leading-relaxed text-brand-warning"
        >
          <strong className="font-semibold text-app-text">Supabase configuration not found.</strong> Set the variables{' '}
          <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code>{' '}
          and anon key in <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[11px]">apps/web/.env.local</code>.
        </div>
      )}

      {params.error === 'confirmation_failed' && (
        <div
          role="alert"
          className="mb-5 border border-brand-danger/30 bg-brand-danger/10 p-3.5 text-xs leading-relaxed text-brand-danger"
        >
          Email confirmation link is invalid or has expired. Try signing in or request a new link.
        </div>
      )}

      <LoginForm redirectTo={safeRedirect} googleAuthEnabled={googleEnabled} />
    </AuthCard>
  );
}

