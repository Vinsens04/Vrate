'use client';

import React, { useActionState, useState } from 'react';
import Link from 'next/link';
import { loginAction } from '../actions/auth-actions';
import { GoogleAuthButton } from './GoogleAuthButton';

interface LoginFormProps {
  redirectTo?: string;
  googleAuthEnabled?: boolean;
}

export function LoginForm({ redirectTo = '/dashboard', googleAuthEnabled = false }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      {state?.error && (
        <div role="alert" aria-live="polite" className="border border-brand-danger/30 bg-brand-danger/10 p-3.5 text-sm leading-6 text-brand-danger">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

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
            <Link href="/forgot-password" className="text-xs font-medium text-app-muted transition hover:text-brand-primary">
              Lupa kata sandi?
            </Link>
          </div>
          <div className="relative mt-2">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
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

        <button type="submit" disabled={isPending} className="vr-primary w-full">
          {isPending ? 'Memproses' : 'Masuk'}
        </button>
      </form>

      {googleAuthEnabled && <GoogleAuthButton redirectTo={redirectTo} />}

      <p className="text-center text-sm text-app-muted">
        Belum punya akun?{' '}
        <Link href="/register" className="vr-link">
          Daftar
        </Link>
      </p>
    </div>
  );
}

