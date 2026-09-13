import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extensionAuthStateSchema,
  extensionMessageSchema,
  signInInputSchema,
  safeUserSchema,
  extensionAuthResponseSchema,
} from './schemas.ts';
import {
  mapExtensionAuthError,
} from './errors.ts';
import {
  clearVrateAuthStorage,
  extensionStorageAdapter,
} from './storage.ts';
import {
  handleExtensionMessage,
} from './messages.ts';

// ------------------------------------------------------------------------------
// Test Suite 1: Extension Input Validation & Zod Schemas
// ------------------------------------------------------------------------------

test('Extension Schemas: signInInputSchema validates credentials properly', () => {
  const valid = signInInputSchema.safeParse({
    email: ' user@vrate.test ',
    password: 'securePassword123',
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.email, 'user@vrate.test');
    assert.equal(valid.data.password, 'securePassword123');
  }

  const invalidEmail = signInInputSchema.safeParse({
    email: 'not-an-email',
    password: 'password123',
  });
  assert.equal(invalidEmail.success, false);

  const emptyPassword = signInInputSchema.safeParse({
    email: 'user@vrate.test',
    password: '',
  });
  assert.equal(emptyPassword.success, false);
});

test('Extension Schemas: extensionMessageSchema parses valid messages & rejects invalid types', () => {
  // Valid AUTH_GET_STATE
  const getState = extensionMessageSchema.safeParse({ type: 'AUTH_GET_STATE' });
  assert.equal(getState.success, true);

  // Valid AUTH_SIGN_IN
  const signInMsg = extensionMessageSchema.safeParse({
    type: 'AUTH_SIGN_IN',
    payload: { email: 'test@vrate.test', password: 'mypassword' },
  });
  assert.equal(signInMsg.success, true);

  // Valid AUTH_SIGN_OUT
  const signOutMsg = extensionMessageSchema.safeParse({ type: 'AUTH_SIGN_OUT' });
  assert.equal(signOutMsg.success, true);

  // Valid OPEN_DASHBOARD
  const openDash = extensionMessageSchema.safeParse({ type: 'OPEN_DASHBOARD' });
  assert.equal(openDash.success, true);

  // Valid OPEN_URL
  const openUrl = extensionMessageSchema.safeParse({
    type: 'OPEN_URL',
    payload: { url: '/register?source=extension' },
  });
  assert.equal(openUrl.success, true);

  // Invalid: Unknown message type
  const unknownType = extensionMessageSchema.safeParse({ type: 'UNSUPPORTED_TYPE' });
  assert.equal(unknownType.success, false);

  // Invalid: Missing payload on SIGN_IN
  const missingPayload = extensionMessageSchema.safeParse({ type: 'AUTH_SIGN_IN' });
  assert.equal(missingPayload.success, false);
});

test('Extension Schemas: safeUserSchema & extensionAuthResponseSchema sanitize user info', () => {
  const safeUser = safeUserSchema.safeParse({
    id: 'usr_123',
    email: 'user@vrate.test',
    displayName: 'Vrate Cinephile',
    avatarUrl: 'https://example.com/avatar.jpg',
  });
  assert.equal(safeUser.success, true);

  const fullResponse = extensionAuthResponseSchema.safeParse({
    success: true,
    state: 'signed_in',
    user: safeUser.data,
    profile: {
      id: 'usr_123',
      displayName: 'Vrate Cinephile',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
    settings: {
      autoDetect: true,
      confirmBeforeTracking: false,
      autoTrackProgress: true,
      autoCompleteThreshold: 90,
      autoAddAfterSeconds: 300,
      theme: 'editorial_dark',
    },
  });
  assert.equal(fullResponse.success, true);

  // Verify allowed auth state values
  assert.ok(extensionAuthStateSchema.safeParse('signed_in').success);
  assert.ok(extensionAuthStateSchema.safeParse('signed_out').success);
  assert.ok(extensionAuthStateSchema.safeParse('loading').success);
  assert.ok(extensionAuthStateSchema.safeParse('offline').success);
  assert.ok(extensionAuthStateSchema.safeParse('expired').success);
  assert.ok(extensionAuthStateSchema.safeParse('unconfigured').success);
  assert.ok(extensionAuthStateSchema.safeParse('error').success);
  assert.equal(extensionAuthStateSchema.safeParse('malicious_state').success, false);
});

// ------------------------------------------------------------------------------
// Test Suite 2: Error Mapping (English & No Leaks)
// ------------------------------------------------------------------------------

test('Error Mapping: mapExtensionAuthError translates error messages without exposing internals', () => {
  assert.equal(
    mapExtensionAuthError(new Error('Invalid login credentials')),
    'Invalid email or password.'
  );
  assert.equal(
    mapExtensionAuthError(new Error('Email not confirmed')),
    'Email not verified. Please check your inbox to confirm your email.'
  );
  assert.equal(
    mapExtensionAuthError(new Error('Rate limit exceeded: too many requests')),
    'Too many sign-in attempts. Please wait a moment before trying again.'
  );
  assert.equal(
    mapExtensionAuthError(new Error('Failed to fetch')),
    'Unable to connect to the server. Please check your internet connection.'
  );
  assert.equal(
    mapExtensionAuthError(new Error('Token is expired or invalid')),
    'Your session has expired. Please sign in again.'
  );
  assert.equal(
    mapExtensionAuthError(new Error('Database syntax error at line 42 with table users')),
    'Authentication failed. Please check your credentials.'
  );
  assert.equal(
    mapExtensionAuthError(null),
    'An unknown error occurred.'
  );
});

// ------------------------------------------------------------------------------
// Test Suite 3: Custom Storage Adapter & Security Isolation
// ------------------------------------------------------------------------------

test('Storage Adapter: prefixes keys and isolates auth data in chrome.storage.local', async () => {
  const inMemoryStore: Record<string, string> = {
    unrelated_extension_key: 'preserve_me',
  };

  // Mock global chrome.storage.local supporting MV3 Promise signatures
  const originalChrome = (globalThis as unknown as { chrome?: unknown }).chrome;
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: (keys: unknown, cb?: (res: Record<string, unknown>) => void) => {
          const result: Record<string, unknown> = {};
          if (keys === null || keys === undefined) {
            Object.assign(result, inMemoryStore);
          } else {
            const keyList = Array.isArray(keys) ? keys : [keys as string];
            for (const k of keyList) {
              if (k in inMemoryStore) {
                result[k] = inMemoryStore[k];
              }
            }
          }
          if (typeof cb === 'function') {
            cb(result);
            return;
          }
          return Promise.resolve(result);
        },
        set: (items: Record<string, unknown>, cb?: () => void) => {
          for (const [k, v] of Object.entries(items)) {
            inMemoryStore[k] = String(v);
          }
          if (typeof cb === 'function') {
            cb();
            return;
          }
          return Promise.resolve();
        },
        remove: (keys: unknown, cb?: () => void) => {
          const keyList = Array.isArray(keys) ? keys : [keys as string];
          for (const k of keyList) {
            delete inMemoryStore[k];
          }
          if (typeof cb === 'function') {
            cb();
            return;
          }
          return Promise.resolve();
        },
      },
    },
  };

  try {
    // 1. Set item through adapter
    await extensionStorageAdapter.setItem('session', JSON.stringify({ token: 'mock-jwt-token' }));
    assert.ok('vrate.auth.session' in inMemoryStore);
    assert.equal(inMemoryStore['unrelated_extension_key'], 'preserve_me');

    // 2. Get item through adapter
    const retrieved = await extensionStorageAdapter.getItem('session');
    assert.equal(retrieved, JSON.stringify({ token: 'mock-jwt-token' }));

    // 3. Remove single item through adapter
    await extensionStorageAdapter.removeItem('session');
    assert.equal(await extensionStorageAdapter.getItem('session'), null);

    // 4. Test clearVrateAuthStorage clears all vrate.auth.* keys without touching other keys
    await extensionStorageAdapter.setItem('key1', 'val1');
    await extensionStorageAdapter.setItem('key2', 'val2');
    assert.ok('vrate.auth.key1' in inMemoryStore);
    assert.ok('vrate.auth.key2' in inMemoryStore);

    await clearVrateAuthStorage();
    assert.equal('vrate.auth.key1' in inMemoryStore, false);
    assert.equal('vrate.auth.key2' in inMemoryStore, false);
    // Unrelated key MUST remain untouched!
    assert.equal(inMemoryStore['unrelated_extension_key'], 'preserve_me');
  } finally {
    (globalThis as unknown as { chrome?: unknown }).chrome = originalChrome;
  }
});

// ------------------------------------------------------------------------------
// Test Suite 4: Content Script Message Isolation
// ------------------------------------------------------------------------------

test('Message Handler: strictly blocks content scripts from privileged auth operations', async () => {
  // A message coming from a webpage content script possesses `sender.tab`
  const maliciousContentScriptSender = {
    tab: { id: 999, url: 'https://malicious-site.example.com' },
    id: 'mock-ext-id',
  } as chrome.runtime.MessageSender;

  const result = await handleExtensionMessage(
    { type: 'AUTH_GET_STATE' },
    maliciousContentScriptSender
  ) as { success: boolean; error?: string };

  assert.equal(result.success, false);
  assert.match(result.error || '', /content script/i);
});

test('Message Handler: rejects malformed message payloads', async () => {
  const trustedSender = {
    id: 'mock-ext-id',
  } as chrome.runtime.MessageSender;

  const result = await handleExtensionMessage(
    { invalidKey: 'junk' },
    trustedSender
  ) as { success: boolean; error?: string };

  assert.equal(result.success, false);
  assert.match(result.error || '', /tidak valid/i);
});
