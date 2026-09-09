import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Kata Sandi Baru - Vrate',
  description: 'Masukkan kata sandi baru untuk akun Vrate.',
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
      title="Kata sandi baru"
      subtitle="Tetapkan kata sandi baru untuk akunmu."
    >
      {!hasValidSession ? (
        <div className="space-y-5 border border-app-border bg-app-surface p-5 text-center">
          <div>
            <h3 className="text-base font-semibold text-app-text">Sesi pemulihan tidak ditemukan</h3>
            <p className="mt-2 text-sm leading-7 text-app-muted">
              Tautan pemulihan mungkin sudah kedaluwarsa atau belum diverifikasi. Minta tautan baru melalui halaman lupa kata sandi.
            </p>
          </div>

          <Link href="/forgot-password" className="vr-primary w-full">
            Minta tautan baru
          </Link>
        </div>
      ) : (
        <ResetPasswordForm />
      )}
    </AuthCard>
  );
}

