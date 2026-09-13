import type { Metadata } from 'next';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Forgot Password - Vrate',
  description: 'Reset your Vrate account password.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      subtitle="Enter your registered email to receive a reset link."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}

