import { NextRequest } from 'next/server';
import { addExtensionLibraryRequestSchema } from '@vrate/shared';
import { authenticateExtensionRequest } from '@/lib/extension-auth/authenticate-extension-request';
import { handleCorsPreflight, isOriginAllowed } from '@/lib/extension-auth/cors';
import { errorResponse, jsonResponse } from '@/lib/extension-auth/responses';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ensureCanonicalMedia,
  addMediaToUserLibrary,
} from '@/features/catalog/services/catalog-library-service';

export async function OPTIONS(request: NextRequest) {
  const preflight = handleCorsPreflight(request);
  if (preflight) {
    return preflight;
  }
  return new Response(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Verify Origin header if present
  if (origin && !isOriginAllowed(origin)) {
    return errorResponse('Origin Browser Extension tidak diizinkan.', 403, origin);
  }

  // Authenticate Bearer JWT
  const authResult = await authenticateExtensionRequest(request);
  if (!authResult.success || !authResult.user || !authResult.userClient) {
    return errorResponse(
      authResult.error || 'Autentikasi gagal.',
      authResult.status || 401,
      origin
    );
  }

  const { user, userClient } = authResult;

  // Parse & validate JSON body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse('Body JSON tidak valid.', 400, origin);
  }

  const validation = addExtensionLibraryRequestSchema.safeParse(rawBody);
  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => i.message).join('; ');
    return errorResponse(`Parameter tidak valid: ${errorMsg}`, 400, origin);
  }

  const { provider, externalId, initialStatus } = validation.data;

  try {
    // 1. Ensure canonical media in global catalog using admin client
    const adminClient = createAdminClient();
    const canonicalResult = await ensureCanonicalMedia(
      adminClient,
      provider,
      externalId
    );

    if (!canonicalResult.success) {
      return errorResponse(canonicalResult.error || 'Gagal menyimpan katalog media.', 400, origin);
    }

    // 2. Add media to user's library using user-scoped client (respecting RLS)
    const libraryResult = await addMediaToUserLibrary(
      userClient,
      user.id,
      canonicalResult.mediaId,
      initialStatus
    );

    if (!libraryResult.success) {
      return errorResponse(
        libraryResult.error || libraryResult.message || 'Gagal menambahkan ke library.',
        400,
        origin
      );
    }

    return jsonResponse(
      {
        success: true,
        alreadyExists: libraryResult.alreadyExists || false,
        entryId: libraryResult.entryId,
        mediaId: libraryResult.mediaId,
        message: libraryResult.message,
      },
      200,
      origin
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return errorResponse(msg, 500, origin);
  }
}
