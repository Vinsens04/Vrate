'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  updateStatusSchema,
  updateRatingSchema,
  toggleFavoriteSchema,
  updateNotesSchema,
  deleteEntrySchema,
} from '../schemas/library-schemas';
import { calculateStatusDates } from '../utils/library-logic';
import type { ActionResult } from '../types/library-types';
import type { LibraryStatus } from '@vrate/shared';

/**
 * Server Action to update the watching status of a library entry.
 * Enforces business rules for started_at and completed_at timestamps.
 */
export async function updateStatusAction(
  entryId: string,
  newStatus: LibraryStatus
): Promise<ActionResult> {
  const parseResult = updateStatusSchema.safeParse({ entryId, status: newStatus });
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid status input.',
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Session expired. Please sign in again.' };
    }

    // 1. Fetch current entry to inspect existing dates
    const { data: currentEntry, error: fetchError } = await supabase
      .from('library_entries')
      .select('status, started_at, completed_at')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentEntry) {
      return { success: false, error: 'Media not found in your library.' };
    }

    // 2. Compute date updates according to domain rules
    const { startedAt, completedAt } = calculateStatusDates(
      currentEntry.status as LibraryStatus,
      newStatus,
      currentEntry.started_at,
      currentEntry.completed_at
    );

    // 3. Update the entry
    const { error: updateError } = await supabase
      .from('library_entries')
      .update({
        status: newStatus,
        started_at: startedAt,
        completed_at: completedAt,
      })
      .eq('id', entryId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update status:', updateError.message);
      return { success: false, error: 'Failed to update status. Please try again later.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/library');
    revalidatePath(`/dashboard/library/${entryId}`);

    return { success: true, message: 'Status updated successfully.' };
  } catch (err) {
    console.error('Unexpected error in updateStatusAction:', err);
    return { success: false, error: 'A system error occurred while updating status.' };
  }
}

/**
 * Server Action to update personal user rating (0-10, step 0.5, or null to clear).
 */
export async function updateRatingAction(
  entryId: string,
  rating: number | null
): Promise<ActionResult> {
  const parseResult = updateRatingSchema.safeParse({ entryId, rating });
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid rating input.',
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Session expired. Please sign in again.' };
    }

    const { error: updateError } = await supabase
      .from('library_entries')
      .update({ rating: parseResult.data.rating })
      .eq('id', entryId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update rating:', updateError.message);
      return { success: false, error: 'Failed to save rating. Please try again later.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/library');
    revalidatePath(`/dashboard/library/${entryId}`);

    return { success: true, message: 'Rating updated successfully.' };
  } catch (err) {
    console.error('Unexpected error in updateRatingAction:', err);
    return { success: false, error: 'A system error occurred while updating rating.' };
  }
}

/**
 * Server Action to toggle the favorite flag.
 */
export async function toggleFavoriteAction(
  entryId: string,
  isFavorite: boolean
): Promise<ActionResult> {
  const parseResult = toggleFavoriteSchema.safeParse({ entryId, isFavorite });
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid favorite input.',
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Session expired. Please sign in again.' };
    }

    const { error: updateError } = await supabase
      .from('library_entries')
      .update({ is_favorite: isFavorite })
      .eq('id', entryId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to toggle favorite:', updateError.message);
      return { success: false, error: 'Failed to update favorite status.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/library');
    revalidatePath(`/dashboard/library/${entryId}`);

    return {
      success: true,
      message: isFavorite ? 'Added to favorites.' : 'Removed from favorites.',
    };
  } catch (err) {
    console.error('Unexpected error in toggleFavoriteAction:', err);
    return { success: false, error: 'A system error occurred while updating favorite.' };
  }
}

/**
 * Server Action to update personal user notes (plain text, max 2000 chars).
 */
export async function updateNotesAction(
  entryId: string,
  notes: string | null
): Promise<ActionResult> {
  const parseResult = updateNotesSchema.safeParse({ entryId, notes });
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid notes input.',
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Session expired. Please sign in again.' };
    }

    const { error: updateError } = await supabase
      .from('library_entries')
      .update({ notes: parseResult.data.notes })
      .eq('id', entryId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update notes:', updateError.message);
      return { success: false, error: 'Failed to save notes. Please try again later.' };
    }

    revalidatePath(`/dashboard/library/${entryId}`);

    return { success: true, message: 'Notes saved successfully.' };
  } catch (err) {
    console.error('Unexpected error in updateNotesAction:', err);
    return { success: false, error: 'A system error occurred while saving notes.' };
  }
}

/**
 * Server Action to delete a library entry.
 * Progress and watch sessions are cascaded at the database level.
 */
export async function deleteEntryAction(entryId: string): Promise<ActionResult> {
  const parseResult = deleteEntrySchema.safeParse({ entryId });
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid entry ID.',
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Session expired. Please sign in again.' };
    }

    const { error: deleteError } = await supabase
      .from('library_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Failed to delete entry:', deleteError.message);
      return { success: false, error: 'Failed to remove entry from library.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/library');

    return { success: true, message: 'Media removed from your library.' };
  } catch (err) {
    console.error('Unexpected error in deleteEntryAction:', err);
    return { success: false, error: 'A system error occurred while removing media.' };
  }
}
