import test from 'node:test';
import assert from 'node:assert/strict';

import { registerSchema } from '../schemas/auth-schemas.ts';
import { getSafeRedirectPath } from './safe-redirect.ts';
import { mapAuthError } from './auth-errors.ts';

// ------------------------------------------------------------------------------
// Test 1: Register Schema Validation & Password Mismatch
// ------------------------------------------------------------------------------
test('registerSchema: succeeds on valid input', () => {
  const valid = registerSchema.safeParse({
    email: 'test@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    agreeTerms: true,
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.email, 'test@example.com');
  }
});

test('registerSchema: fails on password mismatch', () => {
  const invalid = registerSchema.safeParse({
    email: 'test@example.com',
    password: 'password123',
    confirmPassword: 'differentPassword456',
    agreeTerms: true,
  });
  assert.equal(invalid.success, false);
  if (!invalid.success) {
    const error = invalid.error.issues.find((i) => i.path.includes('confirmPassword'));
    assert.ok(error);
    assert.match(error.message, /not match/i);
  }
});

test('registerSchema: fails on short password (< 8 chars)', () => {
  const invalid = registerSchema.safeParse({
    email: 'test@example.com',
    password: 'short',
    confirmPassword: 'short',
    agreeTerms: true,
  });
  assert.equal(invalid.success, false);
});

test('registerSchema: fails if agreeTerms is false', () => {
  const invalid = registerSchema.safeParse({
    email: 'test@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    agreeTerms: false,
  });
  assert.equal(invalid.success, false);
});

// ------------------------------------------------------------------------------
// Test 2: Safe Redirect Path Validation
// ------------------------------------------------------------------------------
test('getSafeRedirectPath: allows safe internal paths', () => {
  assert.equal(getSafeRedirectPath('/dashboard'), '/dashboard');
  assert.equal(getSafeRedirectPath('/profile/settings?tab=1'), '/profile/settings?tab=1');
  assert.equal(getSafeRedirectPath('/watch/movie-1'), '/watch/movie-1');
});

test('getSafeRedirectPath: rejects external URLs and protocol-relative URLs', () => {
  assert.equal(getSafeRedirectPath('https://evil.com'), '/dashboard');
  assert.equal(getSafeRedirectPath('http://malicious.org/phish'), '/dashboard');
  assert.equal(getSafeRedirectPath('//attacker.com'), '/dashboard');
  assert.equal(getSafeRedirectPath('/\\attacker.com'), '/dashboard');
  assert.equal(getSafeRedirectPath('javascript:alert(1)'), '/dashboard');
  assert.equal(getSafeRedirectPath(null), '/dashboard');
  assert.equal(getSafeRedirectPath(''), '/dashboard');
});

// ------------------------------------------------------------------------------
// Test 3: Auth Error Mapping to English
// ------------------------------------------------------------------------------
test('mapAuthError: maps known Supabase errors cleanly', () => {
  assert.equal(
    mapAuthError(new Error('Invalid login credentials')),
    'Invalid email or password.'
  );
  assert.equal(
    mapAuthError(new Error('User already registered')),
    'This email is already registered. Please sign in with your account.'
  );
  assert.equal(
    mapAuthError(new Error('Email not confirmed')),
    'Your email has not been confirmed yet. Please check the confirmation link in your inbox.'
  );
  assert.equal(
    mapAuthError(new Error('Password should be at least 6 characters')),
    'Password must be at least 8 characters.'
  );
  assert.equal(
    mapAuthError(null),
    'An error occurred. Please try again.'
  );
});
