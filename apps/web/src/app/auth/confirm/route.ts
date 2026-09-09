import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafeRedirectPath } from '@/features/auth/utils/safe-redirect';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next');

  // Default redirect for recovery is /reset-password, otherwise /dashboard
  const defaultNext = type === 'recovery' ? '/reset-password' : '/dashboard';
  const safePath = getSafeRedirectPath(next, defaultNext);

  if (token_hash && type) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (!error) {
        return NextResponse.redirect(`${origin}${safePath}`);
      }
    } catch {
      // Fall through to failure redirect
    }
  }

  // Redirect to login with friendly error query parameter
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
