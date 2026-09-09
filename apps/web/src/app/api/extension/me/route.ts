import { NextRequest } from 'next/server';
import { authenticateExtensionRequest } from '@/lib/extension-auth/authenticate-extension-request';
import { handleCorsPreflight, isOriginAllowed } from '@/lib/extension-auth/cors';
import { errorResponse, jsonResponse } from '@/lib/extension-auth/responses';

export async function OPTIONS(request: NextRequest) {
  const preflight = handleCorsPreflight(request);
  if (preflight) {
    return preflight;
  }
  return new Response(null, { status: 204 });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Defense-in-depth: If browser Origin header is provided, verify against allowlist
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

  // Retrieve profile with user-scoped client (subject to RLS)
  const { data: profile } = await userClient
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  // Retrieve user settings with user-scoped client (subject to RLS)
  const { data: settings } = await userClient
    .from('user_settings')
    .select(
      'auto_detect, confirm_before_tracking, auto_track_progress, auto_complete_threshold, auto_add_after_seconds, theme'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ||
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split('@')[0] ||
    'Pengguna';

  return jsonResponse(
    {
      user: {
        email: user.email || '',
        displayName,
      },
      settings: {
        autoDetect: settings?.auto_detect ?? true,
        confirmBeforeTracking: settings?.confirm_before_tracking ?? true,
        autoTrackProgress: settings?.auto_track_progress ?? true,
        autoCompleteThreshold: settings?.auto_complete_threshold ?? 90,
      },
    },
    200,
    origin
  );
}
