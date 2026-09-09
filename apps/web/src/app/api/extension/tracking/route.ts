import { NextRequest } from 'next/server';
import {
  startTrackingRequestSchema,
  checkpointTrackingRequestSchema,
  stopTrackingRequestSchema,
  markEpisodeCompletedRequestSchema,
  deleteEpisodeProgressRequestSchema,
  correctEpisodeRequestSchema,
} from '@vrate/shared';
import { authenticateExtensionRequest } from '@/lib/extension-auth/authenticate-extension-request';
import { handleCorsPreflight, isOriginAllowed } from '@/lib/extension-auth/cors';
import { errorResponse, jsonResponse } from '@/lib/extension-auth/responses';
import {
  recordStartSession,
  recordCheckpoint,
  recordStopSession,
  markEpisodeCompleted,
  deleteEpisodeProgress,
  correctEpisodeProgress,
} from '@/features/library/services/tracking-service';

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

  // Parse JSON body
  let rawBody: Record<string, unknown>;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse('Body JSON tidak valid.', 400, origin);
  }

  const url = new URL(request.url);
  const actionParam = url.searchParams.get('action');
  const action = (actionParam || rawBody.action || 'checkpoint') as string;

  try {
    if (action === 'start') {
      const validation = startTrackingRequestSchema.safeParse(rawBody);
      if (!validation.success) {
        const errorMsg = validation.error.issues.map((i) => i.message).join('; ');
        return errorResponse(`Parameter start tidak valid: ${errorMsg}`, 400, origin);
      }

      const result = await recordStartSession(userClient, user.id, validation.data);
      return jsonResponse(result, result.success ? 200 : 400, origin);
    }

    if (action === 'checkpoint') {
      const validation = checkpointTrackingRequestSchema.safeParse(rawBody);
      if (!validation.success) {
        const errorMsg = validation.error.issues.map((i) => i.message).join('; ');
        return errorResponse(`Parameter checkpoint tidak valid: ${errorMsg}`, 400, origin);
      }

      const result = await recordCheckpoint(userClient, user.id, validation.data);
      return jsonResponse(result, result.success ? 200 : 400, origin);
    }

    if (action === 'stop') {
      const validation = stopTrackingRequestSchema.safeParse(rawBody);
      if (!validation.success) {
        const errorMsg = validation.error.issues.map((i) => i.message).join('; ');
        return errorResponse(`Parameter stop tidak valid: ${errorMsg}`, 400, origin);
      }

      const result = await recordStopSession(userClient, user.id, validation.data);
      return jsonResponse(result, result.success ? 200 : 400, origin);
    }

    if (action === 'mark_completed') {
      const validation = markEpisodeCompletedRequestSchema.safeParse(rawBody);
      if (!validation.success) {
        const errorMsg = validation.error.issues.map((i) => i.message).join('; ');
        return errorResponse(`Parameter mark_completed tidak valid: ${errorMsg}`, 400, origin);
      }

      const result = await markEpisodeCompleted(userClient, user.id, validation.data);
      return jsonResponse(result, result.success ? 200 : 400, origin);
    }

    if (action === 'delete_progress') {
      const validation = deleteEpisodeProgressRequestSchema.safeParse(rawBody);
      if (!validation.success) {
        const errorMsg = validation.error.issues.map((i) => i.message).join('; ');
        return errorResponse(`Parameter delete_progress tidak valid: ${errorMsg}`, 400, origin);
      }

      const result = await deleteEpisodeProgress(userClient, user.id, validation.data);
      return jsonResponse(result, result.success ? 200 : 400, origin);
    }

    if (action === 'correct_episode') {
      const validation = correctEpisodeRequestSchema.safeParse(rawBody);
      if (!validation.success) {
        const errorMsg = validation.error.issues.map((i) => i.message).join('; ');
        return errorResponse(`Parameter correct_episode tidak valid: ${errorMsg}`, 400, origin);
      }

      const result = await correctEpisodeProgress(userClient, user.id, validation.data);
      return jsonResponse(result, result.success ? 200 : 400, origin);
    }

    return errorResponse(`Aksi tidak dikenali: ${action}.`, 400, origin);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan internal pada tracking.';
    return errorResponse(msg, 500, origin);
  }
}
