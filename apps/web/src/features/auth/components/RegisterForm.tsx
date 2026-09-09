'use client';

import React, { useActionState, useState } from 'react';
import Link from 'next/link';
import { registerAction } from '../actions/auth-actions';
import { GoogleAuthButton } from './GoogleAuthButton';

interface RegisterFormProps {
  googleAuthEnabled?: boolean;
}

export function RegisterForm({ googleAuthEnabled = false }: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState(registerAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (state?.needsEmailConfirmation) {
    return (
      <div className="space-y-5 border border-app-border bg-app-surface p-5 text-center">
        <div>
          <h3 className="text-lg font-semibold text-app-text">Periksa email kamu</h3>
          <p className="mt-2 text-sm leading-7 text-app-muted">
            Tautan konfirmasi sudah dikirim ke <span className="font-semibold text-app-text">{state.email}</span>.
          </p>
          <p className="mt-1 text-sm text-app-dim">Buka tautan itu untuk mengaktifkan akun sebelum masuk.</p>
        </div>
        <Link href="/login" className="vr-primary w-full">
          Kembali masuk
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {state?.error && (
        <div role="alert" aria-live="polite" className="border border-brand-danger/30 bg-brand-danger/10 p-3.5 text-sm leading-6 text-brand-danger">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="vr-label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="nama@email.com"
            disabled={isPending}
            className="vr-control mt-2 w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="password" className="vr-label">
              Kata sandi
            </label>
            <span className="text-xs text-app-dim">Minimal 8 karakter</span>
          </div>
          <div className="relative mt-2">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="********"
              disabled={isPending}
              className="vr-control w-full pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-app-dim transition hover:text-app-text"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="vr-label">
            Konfirmasi kata sandi
          </label>
          <div className="relative mt-2">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="********"
              disabled={isPending}
              className="vr-control w-full pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-app-dim transition hover:text-app-text"
              aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-1">
          <input
            id="agreeTerms"
            name="agreeTerms"
            type="checkbox"
            required
            disabled={isPending}
            className="mt-1 h-4 w-4 rounded border-app-border bg-app-surface text-brand-primary focus:ring-brand-primary focus:ring-offset-app-bg"
          />
          <label htmlFor="agreeTerms" className="text-sm leading-6 text-app-muted">
            Saya menyetujui{' '}
            <Link href="/terms-placeholder" className="vr-link">
              Ketentuan Layanan
            </Link>{' '}
            dan{' '}
            <Link href="/terms-placeholder" className="vr-link">
              Kebijakan Privasi
            </Link>
            .
          </label>
        </div>

        <button type="submit" disabled={isPending} className="vr-primary w-full">
          {isPending ? 'Mendaftarkan' : 'Buat akun'}
        </button>
      </form>

      {googleAuthEnabled && <GoogleAuthButton redirectTo="/dashboard" />}

      <p className="text-center text-sm text-app-muted">
        Sudah punya akun?{' '}
        <Link href="/login" className="vr-link">
          Masuk
        </Link>
      </p>
    </div>
  );
}

