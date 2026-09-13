'use client';

import React, { useActionState, useState } from 'react';
import Link from 'next/link';
import { resetPasswordAction } from '../actions/auth-actions';

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="space-y-6">
      {state?.error && (
        <div role="alert" aria-live="polite" className="border border-brand-danger/30 bg-brand-danger/10 p-3.5 text-sm leading-6 text-brand-danger">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="password" className="vr-label">
              New password
            </label>
            <span className="text-xs text-app-dim">At least 8 characters</span>
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
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="vr-label">
            Confirm new password
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
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isPending} className="vr-primary w-full">
          {isPending ? 'Saving...' : 'Save password'}
        </button>
      </form>

      <p className="text-center text-sm text-app-muted">
        Cancel?{' '}
        <Link href="/login" className="vr-link">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

