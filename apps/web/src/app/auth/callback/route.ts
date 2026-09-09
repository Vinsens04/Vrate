import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafeRedirectPath } from '@/features/auth/utils/safe-redirect';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const safePath = getSafeRedirectPath(next, '/dashboard');

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(`${origin}${safePath}`);
      }
    } catch {
      // Fall through to failure redirect
    }
  }

  // Return user to login with failure parameter if code exchange fails
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
