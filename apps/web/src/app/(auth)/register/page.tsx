import type { Metadata } from 'next';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { isGoogleAuthEnabled } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Daftar - Vrate',
  description: 'Daftar akun Vrate untuk melacak film, serial, dan anime favoritmu.',
};

export default function RegisterPage() {
  const googleEnabled = isGoogleAuthEnabled();

  return (
    <AuthCard
      title="Buat akun"
      subtitle="Mulai simpan tontonan, progres, rating, dan catatan di satu library pribadi."
    >
      <RegisterForm googleAuthEnabled={googleEnabled} />
    </AuthCard>
  );
}

