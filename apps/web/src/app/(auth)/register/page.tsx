import type { Metadata } from 'next';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { isGoogleAuthEnabled } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Sign Up - Vrate',
  description: 'Create a Vrate account to track your favorite movies, series, and anime.',
};

export default function RegisterPage() {
  const googleEnabled = isGoogleAuthEnabled();

  return (
    <AuthCard
      title="Create account"
      subtitle="Start saving your titles, progress, ratings, and notes in one personal library."
    >
      <RegisterForm googleAuthEnabled={googleEnabled} />
    </AuthCard>
  );
}

