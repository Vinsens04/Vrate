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
          <h3 className="text-lg font-semibold text-app-text">Link sent</h3>
          <p className="mt-2 text-sm leading-7 text-app-muted">{state.message}</p>
        </div>
        <Link href="/login" className="vr-primary w-full">
          Back to sign in
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
            Registered email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@email.com"
            disabled={isPending}
            className="vr-control mt-2 w-full"
          />
        </div>

        <button type="submit" disabled={isPending} className="vr-primary w-full">
          {isPending ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="text-center text-sm text-app-muted">
        Remember your password?{' '}
        <Link href="/login" className="vr-link">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

