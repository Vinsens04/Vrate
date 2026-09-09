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
    assert.match(error.message, /tidak cocok/);
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
// Test 3: Auth Error Mapping to Bahasa Indonesia
// ------------------------------------------------------------------------------
test('mapAuthError: maps known Supabase errors cleanly', () => {
  assert.equal(
    mapAuthError(new Error('Invalid login credentials')),
    'Email atau kata sandi yang Anda masukkan salah.'
  );
  assert.equal(
    mapAuthError(new Error('User already registered')),
    'Email ini sudah terdaftar. Silakan masuk menggunakan akun Anda.'
  );
  assert.equal(
    mapAuthError(new Error('Email not confirmed')),
    'Email Anda belum dikonfirmasi. Silakan periksa tautan konfirmasi di kotak masuk email Anda.'
  );
  assert.equal(
    mapAuthError(new Error('Password should be at least 6 characters')),
    'Kata sandi harus terdiri dari minimal 8 karakter.'
  );
  assert.equal(
    mapAuthError(null),
    'Terjadi kesalahan. Silakan coba lagi.'
  );
});
