import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  StartTrackingRequest,
  CheckpointTrackingRequest,
  StopTrackingRequest,
  MarkEpisodeCompletedRequest,
  DeleteEpisodeProgressRequest,
  CorrectEpisodeRequest,
  TrackingOperationResponse,
} from '@vrate/shared';
import type { Database } from '@/types/database.types';

/**
 * ==============================================================================
 * EXTENSION VIDEO TRACKING SERVICE (Step 8)
 * ==============================================================================
 * Handles database operations for video progress tracking, watch sessions,
 * episode progression, and intelligent completion thresholds.
 *
 * Security & Integrity:
 * - Operates under user-scoped Supabase client with Row Level Security (RLS).
 * - Enforces auto-complete threshold (default 90% from user_settings).
 * - NEVER downgrades completed status back to watching/watchlist.
 * - Supports idempotent client_session_id tracking with fallback.
 * ==============================================================================
 */

export async function recordStartSession(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: StartTrackingRequest
): Promise<TrackingOperationResponse> {
  const nowIso = new Date().toISOString();

  // 1. Verify library entry belongs to the user
  const { data: entry, error: entryErr } = await (supabase as any)
    .from('library_entries')
    .select('id, status, started_at, completed_at, media_id')
    .eq('id', payload.libraryEntryId)
    .eq('user_id', userId)
    .single();

  if (entryErr || !entry) {
    return {
      success: false,
      error: 'Media tidak ditemukan dalam library Anda.',
    };
  }

  // 2. Transition from 'watchlist' to 'watching' if starting playback
  if (entry.status === 'watchlist') {
    await (supabase as any)
      .from('library_entries')
      .update({
        status: 'watching',
        started_at: entry.started_at || nowIso,
        last_watched_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', entry.id)
      .eq('user_id', userId);
  } else {
    // Touch last_watched_at
    await (supabase as any)
      .from('library_entries')
      .update({
        last_watched_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', entry.id)
      .eq('user_id', userId);
  }

  // 3. Find or create episode_progress
  const episodeNum = payload.episodeNumber ?? 1;
  const seasonNum = payload.seasonNumber ?? null;

  let epQuery = (supabase as any)
    .from('episode_progress')
    .select('id, progress_seconds, duration_seconds, is_completed')
    .eq('library_entry_id', entry.id)
    .eq('episode_number', episodeNum);

  if (seasonNum !== null) {
    epQuery = epQuery.eq('season_number', seasonNum);
  } else {
    epQuery = epQuery.is('season_number', null);
  }

  const { data: existingEp } = await epQuery.maybeSingle();

  let episodeProgressId: string | null = null;

  if (existingEp) {
    episodeProgressId = existingEp.id;
    // Update last watched details
    await (supabase as any)
      .from('episode_progress')
      .update({
        duration_seconds: payload.durationSeconds ?? existingEp.duration_seconds,
        last_source_name: payload.sourceName,
        last_source_url: payload.sourceUrl ?? null,
        last_watched_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', existingEp.id);
  } else {
    // Insert new episode progress
    const { data: newEp } = await (supabase as any)
      .from('episode_progress')
      .insert({
        library_entry_id: entry.id,
        season_number: seasonNum,
        episode_number: episodeNum,
        progress_seconds: payload.initialProgressSeconds,
        duration_seconds: payload.durationSeconds ?? null,
        progress_percent: 0,
        is_completed: false,
        last_source_name: payload.sourceName,
        last_source_url: payload.sourceUrl ?? null,
        last_watched_at: nowIso,
      })
      .select('id')
      .single();

    if (newEp) {
      episodeProgressId = newEp.id;
    }
  }

  // 4. Create watch session (with graceful handling if migration not yet applied)
  let sessionId: string | undefined;

  try {
    const { data: session, error: sessErr } = await (supabase as any)
      .from('watch_sessions')
      .insert({
        user_id: userId,
        library_entry_id: entry.id,
        episode_progress_id: episodeProgressId,
        source_name: payload.sourceName,
        source_domain: payload.sourceDomain,
        source_url: payload.sourceUrl ?? null,
        watched_seconds: 0,
        started_at: nowIso,
        client_session_id: payload.clientSessionId,
        last_checkpoint_at: nowIso,
      })
      .select('id')
      .single();

    if (!sessErr && session) {
      sessionId = session.id;
    } else if (sessErr && (sessErr.message?.includes('client_session_id') || sessErr.message?.includes('last_checkpoint_at'))) {
      // Fallback if migration columns don't exist yet
      const { data: fallbackSession } = await (supabase as any)
        .from('watch_sessions')
        .insert({
          user_id: userId,
          library_entry_id: entry.id,
          episode_progress_id: episodeProgressId,
          source_name: payload.sourceName,
          source_domain: payload.sourceDomain,
          source_url: payload.sourceUrl ?? null,
          watched_seconds: 0,
          started_at: nowIso,
        })
        .select('id')
        .single();

      if (fallbackSession) {
        sessionId = fallbackSession.id;
      }
    }
  } catch {
    // Non-fatal if session table insert fails; progress will still be saved
  }

  return {
    success: true,
    sessionId,
    message: 'Sesi tontonan berhasil dimulai.',
  };
}

export async function recordCheckpoint(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: CheckpointTrackingRequest
): Promise<TrackingOperationResponse> {
  const nowIso = new Date().toISOString();

  // 1. Fetch user auto-complete threshold setting (default 90)
  let threshold = 90;
  try {
    const { data: settings } = await (supabase as any)
      .from('user_settings')
      .select('auto_complete_threshold')
      .eq('user_id', userId)
      .maybeSingle();

    if (settings && typeof settings.auto_complete_threshold === 'number') {
      threshold = settings.auto_complete_threshold;
    }
  } catch {
    // default 90
  }

  // 2. Fetch library entry and media metadata
  const { data: entry, error: entryErr } = await (supabase as any)
    .from('library_entries')
    .select('id, status, started_at, completed_at, media:media_id(id, media_type, total_episodes)')
    .eq('id', payload.libraryEntryId)
    .eq('user_id', userId)
    .single();

  if (entryErr || !entry) {
    return {
      success: false,
      error: 'Media entry tidak ditemukan.',
    };
  }

  // 3. Compute progress percentage and completion criteria
  const duration = payload.durationSeconds ?? null;
  const progressSec = Math.round(payload.progressSeconds);
  const percent = duration && duration > 0
    ? Math.min(100, Math.round((progressSec / duration) * 10000) / 100)
    : 0;

  const shouldCompleteEpisode = payload.isEnded || (duration !== null && percent >= threshold);

  // 4. Update episode progress
  const episodeNum = payload.episodeNumber ?? 1;
  const seasonNum = payload.seasonNumber ?? null;

  let epQuery = (supabase as any)
    .from('episode_progress')
    .select('id, progress_seconds, duration_seconds, is_completed')
    .eq('library_entry_id', entry.id)
    .eq('episode_number', episodeNum);

  if (seasonNum !== null) {
    epQuery = epQuery.eq('season_number', seasonNum);
  } else {
    epQuery = epQuery.is('season_number', null);
  }

  const { data: existingEp } = await epQuery.maybeSingle();

  let isEpCompleted = shouldCompleteEpisode;
  let episodeProgressId: string | null = null;

  if (existingEp) {
    episodeProgressId = existingEp.id;
    // CRITICAL: NEVER downgrade completed status
    isEpCompleted = existingEp.is_completed || shouldCompleteEpisode;

    await (supabase as any)
      .from('episode_progress')
      .update({
        progress_seconds: progressSec,
        duration_seconds: duration ?? existingEp.duration_seconds,
        progress_percent: percent,
        is_completed: isEpCompleted,
        last_watched_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', existingEp.id);
  } else {
    const { data: newEp } = await (supabase as any)
      .from('episode_progress')
      .insert({
        library_entry_id: entry.id,
        season_number: seasonNum,
        episode_number: episodeNum,
        progress_seconds: progressSec,
        duration_seconds: duration,
        progress_percent: percent,
        is_completed: isEpCompleted,
        last_watched_at: nowIso,
      })
      .select('id')
      .single();

    if (newEp) {
      episodeProgressId = newEp.id;
    }
  }

  // 5. Update library_entries status based on completion rules
  const mediaRaw = entry.media;
  const mediaType = mediaRaw?.media_type || 'movie';
  let newStatus = entry.status;
  let newCompletedAt = entry.completed_at;
  let newStartedAt = entry.started_at || nowIso;

  // RULE: Completed status is never downgraded
  if (entry.status !== 'completed') {
    if (mediaType === 'movie') {
      if (isEpCompleted) {
        newStatus = 'completed';
        newCompletedAt = newCompletedAt || nowIso;
      } else if (entry.status === 'watchlist') {
        newStatus = 'watching';
      }
    } else {
      // Series
      if (isEpCompleted) {
        const totalEpisodes = mediaRaw?.total_episodes;
        if (totalEpisodes && totalEpisodes > 0) {
          const { count } = await (supabase as any)
            .from('episode_progress')
            .select('id', { count: 'exact', head: true })
            .eq('library_entry_id', entry.id)
            .eq('is_completed', true);

          if ((count ?? 0) >= totalEpisodes) {
            newStatus = 'completed';
            newCompletedAt = newCompletedAt || nowIso;
          } else if (entry.status === 'watchlist') {
            newStatus = 'watching';
          }
        } else if (entry.status === 'watchlist') {
          newStatus = 'watching';
        }
      } else if (entry.status === 'watchlist') {
        newStatus = 'watching';
      }
    }
  }

  await (supabase as any)
    .from('library_entries')
    .update({
      status: newStatus,
      started_at: newStartedAt,
      completed_at: newCompletedAt,
      last_watched_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', entry.id)
    .eq('user_id', userId);

  // 6. Update watch_sessions watched_seconds
  if (payload.watchedDeltaSeconds > 0 || payload.isEnded) {
    try {
      // Look up session by clientSessionId first
      let sessionRow: { id: string; watched_seconds: number } | null = null;

      try {
        const { data: s } = await (supabase as any)
          .from('watch_sessions')
          .select('id, watched_seconds')
          .eq('user_id', userId)
          .eq('client_session_id', payload.clientSessionId)
          .maybeSingle();
        sessionRow = s;
      } catch {
        // Migration not applied yet
      }

      if (!sessionRow) {
        // Fallback to active session for this library entry
        const { data: s } = await (supabase as any)
          .from('watch_sessions')
          .select('id, watched_seconds')
          .eq('user_id', userId)
          .eq('library_entry_id', entry.id)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        sessionRow = s;
      }

      if (sessionRow) {
        const addedWatched = Math.min(300, Math.max(0, Math.round(payload.watchedDeltaSeconds)));
        const updatePayload: Record<string, unknown> = {
          watched_seconds: (sessionRow.watched_seconds || 0) + addedWatched,
        };

        if (payload.isEnded) {
          updatePayload.ended_at = nowIso;
        }

        try {
          await (supabase as any)
            .from('watch_sessions')
            .update({
              ...updatePayload,
              last_checkpoint_at: nowIso,
            })
            .eq('id', sessionRow.id);
        } catch {
          await (supabase as any)
            .from('watch_sessions')
            .update(updatePayload)
            .eq('id', sessionRow.id);
        }
      }
    } catch {
      // Non-fatal
    }
  }

  return {
    success: true,
    isCompleted: isEpCompleted,
    progressPercent: percent,
    progressSeconds: progressSec,
    durationSeconds: duration,
    message: 'Checkpoint berhasil disimpan.',
  };
}

export async function recordStopSession(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: StopTrackingRequest
): Promise<TrackingOperationResponse> {
  const nowIso = new Date().toISOString();

  // If there are final watched delta seconds, record them via checkpoint logic
  if (payload.watchedDeltaSeconds > 0) {
    await recordCheckpoint(supabase, userId, {
      clientSessionId: payload.clientSessionId,
      libraryEntryId: payload.libraryEntryId,
      episodeNumber: payload.episodeNumber,
      seasonNumber: payload.seasonNumber,
      progressSeconds: payload.finalProgressSeconds,
      durationSeconds: payload.durationSeconds,
      watchedDeltaSeconds: payload.watchedDeltaSeconds,
      playbackRate: 1.0,
      eventType: 'stop',
      isEnded: payload.reason === 'ended',
    });
  }

  // Close watch session
  try {
    try {
      await (supabase as any)
        .from('watch_sessions')
        .update({
          ended_at: nowIso,
          last_checkpoint_at: nowIso,
        })
        .eq('user_id', userId)
        .eq('client_session_id', payload.clientSessionId);
    } catch {
      // Fallback
      await (supabase as any)
        .from('watch_sessions')
        .update({ ended_at: nowIso })
        .eq('user_id', userId)
        .eq('library_entry_id', payload.libraryEntryId)
        .is('ended_at', null);
    }
  } catch {
    // Non-fatal
  }

  return {
    success: true,
    message: 'Sesi tontonan selesai.',
  };
}

export async function markEpisodeCompleted(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: MarkEpisodeCompletedRequest
): Promise<TrackingOperationResponse> {
  const nowIso = new Date().toISOString();

  // 1. Verify library entry belongs to user
  const { data: entry, error: entryErr } = await (supabase as any)
    .from('library_entries')
    .select('id, status, started_at, completed_at, media:media_id(id, media_type, total_episodes)')
    .eq('id', payload.libraryEntryId)
    .eq('user_id', userId)
    .single();

  if (entryErr || !entry) {
    return { success: false, error: 'Media entry tidak ditemukan.' };
  }

  const episodeNum = payload.episodeNumber;
  const seasonNum = payload.seasonNumber ?? null;

  // 2. Find or create episode_progress
  let epQuery = (supabase as any)
    .from('episode_progress')
    .select('id, duration_seconds')
    .eq('library_entry_id', entry.id)
    .eq('episode_number', episodeNum);

  if (seasonNum !== null) {
    epQuery = epQuery.eq('season_number', seasonNum);
  } else {
    epQuery = epQuery.is('season_number', null);
  }

  const { data: existingEp } = await epQuery.maybeSingle();
  const dur = existingEp?.duration_seconds || 1440;

  if (existingEp) {
    await (supabase as any)
      .from('episode_progress')
      .update({
        progress_seconds: dur,
        progress_percent: 100,
        is_completed: true,
        last_watched_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', existingEp.id);
  } else {
    await (supabase as any)
      .from('episode_progress')
      .insert({
        library_entry_id: entry.id,
        season_number: seasonNum,
        episode_number: episodeNum,
        progress_seconds: dur,
        duration_seconds: dur,
        progress_percent: 100,
        is_completed: true,
        last_watched_at: nowIso,
      });
  }

  // 3. Update library_entries status if applicable
  const mediaRaw = entry.media;
  const mediaType = mediaRaw?.media_type || 'movie';
  let newStatus = entry.status;
  let newCompletedAt = entry.completed_at;

  if (entry.status !== 'completed') {
    if (mediaType === 'movie') {
      newStatus = 'completed';
      newCompletedAt = newCompletedAt || nowIso;
    } else {
      const totalEpisodes = mediaRaw?.total_episodes;
      if (totalEpisodes && totalEpisodes > 0) {
        const { count } = await (supabase as any)
          .from('episode_progress')
          .select('id', { count: 'exact', head: true })
          .eq('library_entry_id', entry.id)
          .eq('is_completed', true);

        if ((count ?? 0) >= totalEpisodes) {
          newStatus = 'completed';
          newCompletedAt = newCompletedAt || nowIso;
        } else if (entry.status === 'watchlist') {
          newStatus = 'watching';
        }
      } else if (entry.status === 'watchlist') {
        newStatus = 'watching';
      }
    }
  }

  await (supabase as any)
    .from('library_entries')
    .update({
      status: newStatus,
      completed_at: newCompletedAt,
      last_watched_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', entry.id)
    .eq('user_id', userId);

  return {
    success: true,
    isCompleted: true,
    progressPercent: 100,
    message: `Episode ${episodeNum} berhasil ditandai selesai.`,
  };
}

export async function deleteEpisodeProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: DeleteEpisodeProgressRequest
): Promise<TrackingOperationResponse> {
  const nowIso = new Date().toISOString();

  const { data: entry, error: entryErr } = await (supabase as any)
    .from('library_entries')
    .select('id')
    .eq('id', payload.libraryEntryId)
    .eq('user_id', userId)
    .single();

  if (entryErr || !entry) {
    return { success: false, error: 'Media entry tidak ditemukan.' };
  }

  const episodeNum = payload.episodeNumber;
  const seasonNum = payload.seasonNumber ?? null;

  let query = (supabase as any)
    .from('episode_progress')
    .delete()
    .eq('library_entry_id', entry.id)
    .eq('episode_number', episodeNum);

  if (seasonNum !== null) {
    query = query.eq('season_number', seasonNum);
  } else {
    query = query.is('season_number', null);
  }

  await query;

  await (supabase as any)
    .from('library_entries')
    .update({ updated_at: nowIso })
    .eq('id', entry.id)
    .eq('user_id', userId);

  return {
    success: true,
    message: `Progres episode ${episodeNum} berhasil dihapus.`,
  };
}

export async function correctEpisodeProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: CorrectEpisodeRequest
): Promise<TrackingOperationResponse> {
  const nowIso = new Date().toISOString();

  const { data: entry, error: entryErr } = await (supabase as any)
    .from('library_entries')
    .select('id')
    .eq('id', payload.libraryEntryId)
    .eq('user_id', userId)
    .single();

  if (entryErr || !entry) {
    return { success: false, error: 'Media entry tidak ditemukan.' };
  }

  const currentEp = payload.currentEpisodeNumber;
  const correctedEp = payload.correctedEpisodeNumber;
  const seasonNum = payload.seasonNumber ?? null;

  let query = (supabase as any)
    .from('episode_progress')
    .update({
      episode_number: correctedEp,
      last_watched_at: nowIso,
      updated_at: nowIso,
    })
    .eq('library_entry_id', entry.id)
    .eq('episode_number', currentEp);

  if (seasonNum !== null) {
    query = query.eq('season_number', seasonNum);
  } else {
    query = query.is('season_number', null);
  }

  await query;

  return {
    success: true,
    message: `Nomor episode berhasil diubah dari ${currentEp} ke ${correctedEp}.`,
  };
}
