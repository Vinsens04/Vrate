import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database.types';
import { isSupabaseConfigured, getPublicSupabaseConfig } from './config';
import { getSafeRedirectPath } from '@/features/auth/utils/safe-redirect';

/**
 * Refreshes Supabase session tokens stored in cookies and enforces authentication guards.
 * Compatible with Next.js 15 App Router.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // If Supabase environment is not yet configured, allow public navigation without crashing.
  if (!isSupabaseConfigured()) {
    if (pathname.startsWith('/dashboard')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'unconfigured');
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const { url, anonKey } = getPublicSupabaseConfig();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Use getUser() instead of getSession() to securely validate session with auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password';

  const isProtectedRoute = pathname.startsWith('/dashboard');

  // Case 1: Unauthenticated user attempting to access protected route
  if (!user && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    const safeNext = getSafeRedirectPath(pathname + (request.nextUrl.search || ''));
    loginUrl.searchParams.set('redirectTo', safeNext);
    return NextResponse.redirect(loginUrl);
  }

  // Case 2: Authenticated user attempting to access login/register/forgot-password
  if (user && isAuthRoute) {
    const rawRedirect = searchParams.get('redirectTo');
    const targetPath = getSafeRedirectPath(rawRedirect, '/dashboard');
    return NextResponse.redirect(new URL(targetPath, request.url));
  }

  return response;
}
