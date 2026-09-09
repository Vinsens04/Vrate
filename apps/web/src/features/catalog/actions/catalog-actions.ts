'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { addToLibrarySchema } from '../schemas/catalog-schemas';
import type {
  AddToLibraryInput,
  AddToLibraryResult,
} from '../types/catalog-types';
import {
  ensureCanonicalMedia,
  addMediaToUserLibrary,
} from '../services/catalog-library-service';

/**
 * Server action to fetch authoritative media details, persist/deduplicate in
 * global catalog (via server-only admin client), and insert into the user's
 * personal library (via authenticated client respecting RLS).
 */
export async function addToLibraryAction(
  rawInput: AddToLibraryInput
): Promise<AddToLibraryResult> {
  // 1. Authenticate user
  const userSupabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userSupabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: 'Silakan masuk terlebih dahulu untuk menambahkan media ke library.',
      message: 'Autentikasi diperlukan.',
    };
  }

  // 2. Validate input with Zod
  const validation = addToLibrarySchema.safeParse(rawInput);
  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => i.message).join('; ');
    return {
      success: false,
      error: errorMsg,
      message: 'Parameter tidak valid.',
    };
  }

  const { provider, externalId, providerMediaType, initialStatus } = validation.data;

  // 3. Ensure global canonical media entry via admin client
  const adminClient = createAdminClient();
  const canonicalResult = await ensureCanonicalMedia(
    adminClient,
    provider,
    externalId,
    providerMediaType
  );

  if (!canonicalResult.success) {
    return {
      success: false,
      error: canonicalResult.error,
      message: 'Gagal memproses katalog media.',
    };
  }

  // 4. Add to user library using user-scoped client (respecting RLS)
  const libraryResult = await addMediaToUserLibrary(
    userSupabase,
    user.id,
    canonicalResult.mediaId,
    initialStatus
  );

  if (!libraryResult.success) {
    return {
      success: false,
      error: libraryResult.error || 'Gagal menambahkan media ke library.',
      message: libraryResult.message,
    };
  }

  // 5. Revalidate affected pages
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/library');
  revalidatePath('/dashboard/discover');

  return {
    success: true,
    alreadyExists: libraryResult.alreadyExists,
    entryId: libraryResult.entryId,
    mediaId: libraryResult.mediaId,
    message: libraryResult.message,
  };
}
