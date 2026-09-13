'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth-schemas';
import { mapAuthError } from '../utils/auth-errors';
import { getSafeRedirectPath } from '../utils/safe-redirect';

export interface AuthActionResult {
  success: boolean;
  error?: string;
  message?: string;
  needsEmailConfirmation?: boolean;
  email?: string;
}

/**
 * Dynamically resolves current app origin to support both localhost and production deployment.
 */
async function getAppOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/**
 * Server action for user login.
 */
export async function loginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const rawEmail = formData.get('email');
  const rawPassword = formData.get('password');
  const rawRedirect = formData.get('redirectTo');

  const parseResult = loginSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  });

  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || 'Invalid input';
    return { success: false, error: errorMsg };
  }

  const { email, password } = parseResult.data;
  let targetPath = '/dashboard';

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: mapAuthError(error) };
    }

    targetPath = getSafeRedirectPath(typeof rawRedirect === 'string' ? rawRedirect : null, '/dashboard');
  } catch (err) {
    return { success: false, error: mapAuthError(err) };
  }

  redirect(targetPath);
}

/**
 * Server action for user registration.
 */
export async function registerAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const rawEmail = formData.get('email');
  const rawPassword = formData.get('password');
  const rawConfirmPassword = formData.get('confirmPassword');
  const rawAgreeTerms = formData.get('agreeTerms') === 'on' || formData.get('agreeTerms') === 'true';

  const parseResult = registerSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
    confirmPassword: rawConfirmPassword,
    agreeTerms: rawAgreeTerms,
  });

  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || 'Invalid registration input';
    return { success: false, error: errorMsg };
  }

  const { email, password } = parseResult.data;
  const origin = await getAppOrigin();
  const emailRedirectTo = `${origin}/auth/confirm?next=${encodeURIComponent('/dashboard')}`;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      return { success: false, error: mapAuthError(error) };
    }

    // If email confirmation is enabled and user is not yet confirmed
    if (data.user && (!data.session || data.user.identities?.length === 0)) {
      return {
        success: true,
        needsEmailConfirmation: true,
        email,
        message: 'Your account has been created successfully. Please check your email inbox to confirm your registration.',
      };
    }
  } catch (err) {
    return { success: false, error: mapAuthError(err) };
  }

  redirect('/dashboard');
}

/**
 * Server action for forgot password request.
 * Always returns a neutral, friendly message to prevent email enumeration.
 */
export async function forgotPasswordAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const rawEmail = formData.get('email');

  const parseResult = forgotPasswordSchema.safeParse({
    email: rawEmail,
  });

  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || 'Invalid email';
    return { success: false, error: errorMsg };
  }

  const { email } = parseResult.data;
  const origin = await getAppOrigin();
  const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent('/reset-password')}`;

  try {
    const supabase = await createClient();
    // Request password reset email from Supabase
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
  } catch {
    // Neutral handling: do not expose whether email exists or network errors
  }

  // Consistent neutral response
  return {
    success: true,
    message: 'If this email is registered with Vrate, we have sent instructions and a link to reset your password. Please check your inbox or spam folder.',
  };
}

/**
 * Server action for password reset/update.
 */
export async function resetPasswordAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const rawPassword = formData.get('password');
  const rawConfirmPassword = formData.get('confirmPassword');

  const parseResult = resetPasswordSchema.safeParse({
    password: rawPassword,
    confirmPassword: rawConfirmPassword,
  });

  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || 'Invalid password';
    return { success: false, error: errorMsg };
  }

  const { password } = parseResult.data;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return { success: false, error: mapAuthError(error) };
    }
  } catch (err) {
    return { success: false, error: mapAuthError(err) };
  }

  redirect('/dashboard?message=password_updated');
}

/**
 * Server action for signing out.
 */
export async function signOutAction(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Gracefully handle signout if session already expired
  }

  redirect('/login');
}
