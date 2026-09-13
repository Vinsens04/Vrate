import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { MetadataProvider, MediaType } from '@vrate/shared';
import { getAniListDetail } from '../providers/anilist/client';
import { getTmdbMovieDetail, getTmdbTvDetail } from '../providers/tmdb/client';
import type { CatalogMedia, InitialLibraryStatus } from '../types/catalog-types';
import { calculateInitialStatusDates } from '../utils/catalog-logic';

export interface EnsureCanonicalMediaResult {
  mediaId: string;
  isNew: boolean;
  media?: CatalogMedia;
}

/**
 * Ensures that a media item from an external provider (TMDB or AniList) exists
 * in the canonical global catalog (media and media_external_ids tables).
 * MUST be executed using the server adminClient since media and media_external_ids
 * write operations require elevated privileges.
 */
export async function ensureCanonicalMedia(
  adminClient: SupabaseClient<Database>,
  provider: MetadataProvider,
  externalId: string,
  providerMediaType?: 'movie' | 'tv' | null
): Promise<{ success: true; mediaId: string } | { success: false; error: string }> {
  try {
    // 1. Check if external mapping already exists
    const { data: existingMapping } = await adminClient
      .from('media_external_ids')
      .select('media_id')
      .eq('provider', provider)
      .eq('external_id', externalId)
      .maybeSingle();

    if (existingMapping) {
      return { success: true, mediaId: existingMapping.media_id };
    }

    // 2. Fetch authoritative fresh details directly from upstream provider
    let media: CatalogMedia;
    if (provider === 'tmdb') {
      if (providerMediaType === 'tv') {
        media = await getTmdbTvDetail(externalId);
      } else {
        media = await getTmdbMovieDetail(externalId);
      }
    } else if (provider === 'anilist') {
      media = await getAniListDetail(externalId);
    } else {
      return { success: false, error: 'Provider not supported.' };
    }

    // 3. Insert canonical media record
    const { data: insertedMedia, error: mediaErr } = await adminClient
      .from('media')
      .insert({
        media_type: media.mediaType,
        title: media.title,
        original_title: media.originalTitle,
        overview: media.overview,
        poster_url: media.posterUrl,
        backdrop_url: media.backdropUrl,
        release_date: media.releaseDate,
        release_year: media.releaseYear,
        runtime_minutes: media.runtimeMinutes,
        total_seasons: media.totalSeasons,
        total_episodes: media.totalEpisodes,
        metadata: {
          provider: media.provider,
          externalId: media.externalId,
          genres: media.genres,
          providerRating: media.providerRating,
          status: media.status,
        },
      })
      .select('id')
      .single();

    if (mediaErr || !insertedMedia) {
      return { success: false, error: 'Failed to save media catalog.' };
    }

    // 4. Insert external ID mapping with conflict handling
    const { error: mapErr } = await adminClient
      .from('media_external_ids')
      .insert({
        media_id: insertedMedia.id,
        provider,
        external_id: externalId,
      });

    if (mapErr) {
      // Handle race condition: another concurrent worker inserted the mapping
      if (mapErr.code === '23505') {
        const { data: conflictMapping } = await adminClient
          .from('media_external_ids')
          .select('media_id')
          .eq('provider', provider)
          .eq('external_id', externalId)
          .single();

        if (conflictMapping) {
          // Clean up unmapped orphan media
          await adminClient.from('media').delete().eq('id', insertedMedia.id);
          return { success: true, mediaId: conflictMapping.media_id };
        }
      }
      return { success: false, error: 'Failed to map media external identity.' };
    }

    return { success: true, mediaId: insertedMedia.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Upstream provider error.';
    return { success: false, error: errorMsg };
  }
}

export interface AddUserLibraryResult {
  success: boolean;
  alreadyExists?: boolean;
  entryId?: string;
  mediaId?: string;
  message: string;
  error?: string;
}

/**
 * Adds a canonical media item to the user's personal library.
 * STRICT REQUIREMENT: Must use the user-scoped Supabase client to enforce Row Level Security (RLS).
 */
export async function addMediaToUserLibrary(
  userClient: SupabaseClient<Database>,
  userId: string,
  mediaId: string,
  initialStatus: InitialLibraryStatus
): Promise<AddUserLibraryResult> {
  try {
    // 1. Check if user already has this media in library
    const { data: existingEntry } = await userClient
      .from('library_entries')
      .select('id, status')
      .eq('media_id', mediaId)
      .maybeSingle();

    if (existingEntry) {
      return {
        success: true,
        alreadyExists: true,
        entryId: existingEntry.id,
        mediaId,
        message: 'This media is already in your library.',
      };
    }

    // 2. Insert library entry
    const { startedAt, completedAt } = calculateInitialStatusDates(initialStatus);

    const { data: newEntry, error: insertErr } = await userClient
      .from('library_entries')
      .insert({
        user_id: userId,
        media_id: mediaId,
        status: initialStatus,
        started_at: startedAt,
        completed_at: completedAt,
      })
      .select('id')
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        return {
          success: true,
          alreadyExists: true,
          mediaId,
          message: 'This media is already in your library.',
        };
      }
      return {
        success: false,
        error: insertErr.message,
        message: 'Failed to add media to library.',
      };
    }

    return {
      success: true,
      entryId: newEntry.id,
      mediaId,
      message: 'Media successfully added to your library.',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'A system error occurred.';
    return {
      success: false,
      error: message,
      message: 'Failed to add media to library.',
    };
  }
}
