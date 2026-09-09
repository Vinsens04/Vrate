import type { Metadata } from 'next';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Lupa Kata Sandi - Vrate',
  description: 'Atur ulang kata sandi akun Vrate.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Atur ulang kata sandi"
      subtitle="Masukkan email terdaftar untuk menerima tautan pemulihan."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}

