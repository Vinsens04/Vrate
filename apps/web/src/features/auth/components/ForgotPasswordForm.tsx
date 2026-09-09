'use client';

import React, { useActionState } from 'react';
import Link from 'next/link';
import { forgotPasswordAction } from '../actions/auth-actions';

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, null);

  if (state?.success && state.message) {
    return (
      <div className="space-y-5 border border-app-border bg-app-surface p-5 text-center">
        <div>
          <h3 className="text-lg font-semibold text-app-text">Tautan terkirim</h3>
          <p className="mt-2 text-sm leading-7 text-app-muted">{state.message}</p>
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
            Email terdaftar
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

        <button type="submit" disabled={isPending} className="vr-primary w-full">
          {isPending ? 'Mengirim' : 'Kirim tautan pemulihan'}
        </button>
      </form>

      <p className="text-center text-sm text-app-muted">
        Ingat kata sandi?{' '}
        <Link href="/login" className="vr-link">
          Kembali masuk
        </Link>
      </p>
    </div>
  );
}

