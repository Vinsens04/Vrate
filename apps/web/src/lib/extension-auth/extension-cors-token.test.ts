import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCorsHeaders,
  handleCorsPreflight,
  isOriginAllowed,
} from './cors.ts';
import {
  errorResponse,
  jsonResponse,
} from './responses.ts';
import {
  extractBearerToken,
} from './extract-token.ts';

// ------------------------------------------------------------------------------
// Test Suite 1: Web CORS Defense & Whitelist Validation
// ------------------------------------------------------------------------------

test('CORS: isOriginAllowed matches approved extension origins and localhost', () => {
  const allowedExtId = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop';
  process.env.EXTENSION_ALLOWED_ORIGINS = allowedExtId;

  assert.equal(isOriginAllowed(allowedExtId), true);
  assert.equal(isOriginAllowed('chrome-extension://evil-extension-id-123456789'), false);
  assert.equal(isOriginAllowed('https://malicious-website.com'), false);
  // Non-browser direct server requests (origin is null) are permitted through to Bearer auth
  assert.equal(isOriginAllowed(null), true);
});

test('CORS: getCorsHeaders sets strict headers and handles preflight OPTIONS properly', () => {
  const allowedOrigin = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop';
  process.env.EXTENSION_ALLOWED_ORIGINS = allowedOrigin;

  const corsHeaders = getCorsHeaders(allowedOrigin);
  assert.equal(corsHeaders['Access-Control-Allow-Origin'], allowedOrigin);
  assert.equal(corsHeaders['Vary'], 'Origin');
  assert.match(corsHeaders['Access-Control-Allow-Methods'], /GET/);
  assert.match(corsHeaders['Access-Control-Allow-Headers'], /Authorization/);

  // Preflight check for allowed origin
  const req = new Request('http://localhost:3000/api/extension/me', {
    method: 'OPTIONS',
    headers: { Origin: allowedOrigin },
  });
  const preflightRes = handleCorsPreflight(req);
  assert.ok(preflightRes);
  assert.equal(preflightRes.status, 204);

  // Preflight check for unapproved origin returns 403 Forbidden
  const evilReq = new Request('http://localhost:3000/api/extension/me', {
    method: 'OPTIONS',
    headers: { Origin: 'https://evil.com' },
  });
  const evilPreflight = handleCorsPreflight(evilReq);
  assert.ok(evilPreflight);
  assert.equal(evilPreflight.status, 403);
});

// ------------------------------------------------------------------------------
// Test Suite 2: Bearer Authentication Header Validation
// ------------------------------------------------------------------------------

test('Bearer Auth: extractBearerToken validates authorization header format', () => {
  // Missing Authorization header
  const resMissing = extractBearerToken(null);
  assert.equal(resMissing.success, false);
  assert.equal(resMissing.status, 401);
  assert.match(resMissing.error || '', /Authorization/);

  // Basic auth instead of Bearer
  const resBasic = extractBearerToken('Basic dXNlcjpwYXNz');
  assert.equal(resBasic.success, false);
  assert.equal(resBasic.status, 401);

  // Empty Bearer token
  const resEmpty = extractBearerToken('Bearer   ');
  assert.equal(resEmpty.success, false);
  assert.equal(resEmpty.status, 401);

  // Short/malformed token (< 10 chars)
  const resShort = extractBearerToken('Bearer 123');
  assert.equal(resShort.success, false);
  assert.equal(resShort.status, 401);

  // Header exceeding 2048 chars
  const hugeHeader = 'Bearer ' + 'a'.repeat(2050);
  const resHuge = extractBearerToken(hugeHeader);
  assert.equal(resHuge.success, false);
  assert.equal(resHuge.status, 400);

  // Valid Bearer token
  const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M';
  const resValid = extractBearerToken(`Bearer ${validToken}`);
  assert.equal(resValid.success, true);
  assert.equal(resValid.token, validToken);
});

// ------------------------------------------------------------------------------
// Test Suite 3: Safe JSON Responses & Anti-Caching
// ------------------------------------------------------------------------------

test('Responses: jsonResponse & errorResponse enforce no-cache headers', async () => {
  const successRes = jsonResponse({ ok: true });
  assert.equal(successRes.status, 200);
  assert.equal(successRes.headers.get('Cache-Control'), 'no-store, no-cache, must-revalidate');

  const data = await successRes.json() as { ok: boolean };
  assert.deepEqual(data, { ok: true });

  const errRes = errorResponse('Akses ditolak', 403);
  assert.equal(errRes.status, 403);
  assert.equal(errRes.headers.get('Cache-Control'), 'no-store, no-cache, must-revalidate');

  const errData = await errRes.json() as { error: string };
  assert.deepEqual(errData, { error: 'Akses ditolak' });
});
