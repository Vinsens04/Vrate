import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'New Password - Vrate',
  description: 'Enter a new password for your Vrate account.',
};

export default async function ResetPasswordPage() {
  let hasValidSession = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      hasValidSession = Boolean(user);
    } catch {
      hasValidSession = false;
    }
  }

  return (
    <AuthCard
      title="New password"
      subtitle="Set a new password for your account."
    >
      {!hasValidSession ? (
        <div className="space-y-5 border border-app-border bg-app-surface p-5 text-center">
          <div>
            <h3 className="text-base font-semibold text-app-text">Recovery session not found</h3>
            <p className="mt-2 text-sm leading-7 text-app-muted">
              The recovery link may have expired or has not been verified yet. Request a new link via the forgot password page.
            </p>
          </div>

          <Link href="/forgot-password" className="vr-primary w-full">
            Request a new link
          </Link>
        </div>
      ) : (
        <ResetPasswordForm />
      )}
    </AuthCard>
  );
}

