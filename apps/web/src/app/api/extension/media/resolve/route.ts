import { NextRequest } from 'next/server';
import { resolveMediaRequestSchema, type ResolvedMediaItem } from '@vrate/shared';
import { authenticateExtensionRequest } from '@/lib/extension-auth/authenticate-extension-request';
import { handleCorsPreflight, isOriginAllowed } from '@/lib/extension-auth/cors';
import { errorResponse, jsonResponse } from '@/lib/extension-auth/responses';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAniListDetail, searchAniList } from '@/features/catalog/providers/anilist/client';
import {
  getTmdbMovieDetail,
  getTmdbTvDetail,
  isTmdbConfigured,
  searchTmdb,
} from '@/features/catalog/providers/tmdb/client';

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

  const { userClient } = authResult;

  // Parse & validate JSON body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse('Body JSON tidak valid.', 400, origin);
  }

  const validation = resolveMediaRequestSchema.safeParse(rawBody);
  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => i.message).join('; ');
    return errorResponse(`Parameter tidak valid: ${errorMsg}`, 400, origin);
  }

  const { provider, externalId, titleHint } = validation.data;
  const adminClient = createAdminClient();

  try {
    // Scenario 1: Exact AniList Provider & ID
    if (provider === 'anilist' && externalId) {
      // 1. Check local catalog first
      const { data: mapping } = await adminClient
        .from('media_external_ids')
        .select('media_id, media(*)')
        .eq('provider', 'anilist')
        .eq('external_id', externalId)
        .maybeSingle();

      if (mapping && mapping.media) {
        const m = mapping.media as any;
        const { data: userEntry } = await userClient
          .from('library_entries')
          .select('id, status')
          .eq('media_id', m.id)
          .maybeSingle();

        const candidate: ResolvedMediaItem = {
          provider: 'anilist',
          externalId,
          mediaType: m.media_type,
          title: m.title,
          originalTitle: m.original_title,
          overview: m.overview,
          posterUrl: m.poster_url,
          backdropUrl: m.backdrop_url,
          releaseYear: m.release_year,
          totalEpisodes: m.total_episodes,
          inLibrary: Boolean(userEntry),
          libraryEntryId: userEntry?.id || null,
          libraryStatus: (userEntry?.status as any) || null,
        };

        return jsonResponse(
          {
            success: true,
            candidates: [candidate],
            exactMatch: true,
          },
          200,
          origin
        );
      }

      // 2. Fetch fresh upstream details server-side
      try {
        const fresh = await getAniListDetail(externalId);
        const candidate: ResolvedMediaItem = {
          provider: 'anilist',
          externalId,
          mediaType: fresh.mediaType,
          title: fresh.title,
          originalTitle: fresh.originalTitle,
          overview: fresh.overview,
          posterUrl: fresh.posterUrl,
          backdropUrl: fresh.backdropUrl,
          releaseYear: fresh.releaseYear,
          totalEpisodes: fresh.totalEpisodes,
          inLibrary: false,
        };

        return jsonResponse(
          {
            success: true,
            candidates: [candidate],
            exactMatch: true,
          },
          200,
          origin
        );
      } catch {
        // Upstream AniList unavailable or 403. Try fallback local search by titleHint
        if (titleHint && titleHint.trim().length >= 2) {
          const cleanHint = titleHint.trim();
          const { data: localMatches } = await adminClient
            .from('media')
            .select('id, media_type, title, original_title, overview, poster_url, backdrop_url, release_year, total_episodes, media_external_ids(provider, external_id)')
            .ilike('title', `%${cleanHint}%`)
            .limit(5);

          if (localMatches && localMatches.length > 0) {
            const candidates: ResolvedMediaItem[] = [];
            for (const item of localMatches) {
              const ext = (item as any).media_external_ids?.[0];
              const { data: userEntry } = await userClient
                .from('library_entries')
                .select('id, status')
                .eq('media_id', item.id)
                .maybeSingle();

              candidates.push({
                provider: (ext?.provider as any) || 'anilist',
                externalId: ext?.external_id || item.id,
                mediaType: item.media_type,
                title: item.title,
                originalTitle: item.original_title,
                overview: item.overview,
                posterUrl: item.poster_url,
                backdropUrl: item.backdrop_url,
                releaseYear: item.release_year,
                totalEpisodes: item.total_episodes,
                inLibrary: Boolean(userEntry),
                libraryEntryId: userEntry?.id || null,
                libraryStatus: (userEntry?.status as any) || null,
              });
            }

            return jsonResponse(
              {
                success: true,
                candidates,
                exactMatch: false,
                message: 'Metadata AniList tidak dapat diakses langsung. Menampilkan hasil katalog lokal.',
              },
              200,
              origin
            );
          }
        }

        return jsonResponse(
          {
            success: true,
            candidates: [],
            exactMatch: false,
            message: 'Metadata anime untuk AniList ID ini belum tersedia dan upstream tidak merespon.',
          },
          200,
          origin
        );
      }
    }

    // Scenario 2: Exact TMDB Provider & ID
    if (provider === 'tmdb' && externalId) {
      const { data: mapping } = await adminClient
        .from('media_external_ids')
        .select('media_id, media(*)')
        .eq('provider', 'tmdb')
        .eq('external_id', externalId)
        .maybeSingle();

      if (mapping && mapping.media) {
        const m = mapping.media as any;
        const { data: userEntry } = await userClient
          .from('library_entries')
          .select('id, status')
          .eq('media_id', m.id)
          .maybeSingle();

        const candidate: ResolvedMediaItem = {
          provider: 'tmdb',
          externalId,
          mediaType: m.media_type,
          title: m.title,
          originalTitle: m.original_title,
          overview: m.overview,
          posterUrl: m.poster_url,
          backdropUrl: m.backdrop_url,
          releaseYear: m.release_year,
          totalEpisodes: m.total_episodes,
          inLibrary: Boolean(userEntry),
          libraryEntryId: userEntry?.id || null,
          libraryStatus: (userEntry?.status as any) || null,
        };

        return jsonResponse(
          {
            success: true,
            candidates: [candidate],
            exactMatch: true,
          },
          200,
          origin
        );
      }

      if (isTmdbConfigured()) {
        try {
          // Attempt movie or tv detail
          let fresh;
          try {
            fresh = await getTmdbMovieDetail(externalId);
          } catch {
            fresh = await getTmdbTvDetail(externalId);
          }

          const candidate: ResolvedMediaItem = {
            provider: 'tmdb',
            externalId,
            mediaType: fresh.mediaType,
            title: fresh.title,
            originalTitle: fresh.originalTitle,
            overview: fresh.overview,
            posterUrl: fresh.posterUrl,
            backdropUrl: fresh.backdropUrl,
            releaseYear: fresh.releaseYear,
            totalEpisodes: fresh.totalEpisodes,
            inLibrary: false,
          };

          return jsonResponse(
            {
              success: true,
              candidates: [candidate],
              exactMatch: true,
            },
            200,
            origin
          );
        } catch {
          // TMDB error
        }
      }
    }

    // Scenario 3: Generic Detector / Title Hint Search
    const searchTitle = titleHint?.trim() || '';
    if (!searchTitle || searchTitle.length < 2) {
      return jsonResponse(
        {
          success: true,
          candidates: [],
          exactMatch: false,
          message: 'Judul belum dapat dipastikan.',
        },
        200,
        origin
      );
    }

    const candidates: ResolvedMediaItem[] = [];
    const seenExternal = new Set<string>();

    // 1. Search local catalog first
    const { data: localItems } = await adminClient
      .from('media')
      .select('id, media_type, title, original_title, overview, poster_url, backdrop_url, release_year, total_episodes, media_external_ids(provider, external_id)')
      .ilike('title', `%${searchTitle}%`)
      .limit(5);

    if (localItems) {
      for (const item of localItems) {
        const ext = (item as any).media_external_ids?.[0];
        const prov = (ext?.provider as any) || 'tmdb';
        const extId = ext?.external_id || item.id;
        const key = `${prov}:${extId}`;

        if (!seenExternal.has(key)) {
          seenExternal.add(key);
          const { data: userEntry } = await userClient
            .from('library_entries')
            .select('id, status')
            .eq('media_id', item.id)
            .maybeSingle();

          candidates.push({
            provider: prov,
            externalId: extId,
            mediaType: item.media_type,
            title: item.title,
            originalTitle: item.original_title,
            overview: item.overview,
            posterUrl: item.poster_url,
            backdropUrl: item.backdrop_url,
            releaseYear: item.release_year,
            totalEpisodes: item.total_episodes,
            inLibrary: Boolean(userEntry),
            libraryEntryId: userEntry?.id || null,
            libraryStatus: (userEntry?.status as any) || null,
          });
        }
      }
    }

    // 2. If fewer than 5 candidates, query AniList and TMDB search
    if (candidates.length < 5) {
      try {
        const anilistRes = await searchAniList(searchTitle, 1);
        if (anilistRes.available && anilistRes.results) {
          for (const aniItem of anilistRes.results) {
            if (candidates.length >= 5) break;
            const key = `anilist:${aniItem.externalId}`;
            if (!seenExternal.has(key)) {
              seenExternal.add(key);
              candidates.push({
                provider: 'anilist',
                externalId: aniItem.externalId,
                mediaType: aniItem.mediaType,
                title: aniItem.title,
                originalTitle: aniItem.originalTitle,
                overview: aniItem.overview,
                posterUrl: aniItem.posterUrl,
                backdropUrl: aniItem.backdropUrl,
                releaseYear: aniItem.releaseYear,
                totalEpisodes: aniItem.totalEpisodes,
                inLibrary: false,
              });
            }
          }
        }
      } catch {
        // Non-fatal
      }
    }

    if (candidates.length < 5 && isTmdbConfigured()) {
      try {
        const tmdbRes = await searchTmdb(searchTitle, 1);
        if (tmdbRes.available && tmdbRes.results) {
          for (const tmdbItem of tmdbRes.results) {
            if (candidates.length >= 5) break;
            const key = `tmdb:${tmdbItem.externalId}`;
            if (!seenExternal.has(key)) {
              seenExternal.add(key);
              candidates.push({
                provider: 'tmdb',
                externalId: tmdbItem.externalId,
                mediaType: tmdbItem.mediaType,
                title: tmdbItem.title,
                originalTitle: tmdbItem.originalTitle,
                overview: tmdbItem.overview,
                posterUrl: tmdbItem.posterUrl,
                backdropUrl: tmdbItem.backdropUrl,
                releaseYear: tmdbItem.releaseYear,
                totalEpisodes: tmdbItem.totalEpisodes,
                inLibrary: false,
              });
            }
          }
        }
      } catch {
        // Non-fatal
      }
    }

    // 3. For any external items added from upstream search, check if user library has them
    if (candidates.length > 0) {
      const extIds = candidates.map((c) => c.externalId);
      const { data: extMappings } = await adminClient
        .from('media_external_ids')
        .select('media_id, provider, external_id')
        .in('external_id', extIds);

      if (extMappings && extMappings.length > 0) {
        const mediaIdMap = new Map<string, string>();
        for (const m of extMappings) {
          mediaIdMap.set(`${m.provider}:${m.external_id}`, m.media_id);
        }

        const mediaIds = Array.from(mediaIdMap.values());
        const { data: userEntries } = await userClient
          .from('library_entries')
          .select('id, media_id, status')
          .in('media_id', mediaIds);

        if (userEntries) {
          const userEntryMap = new Map<string, { id: string; status: string }>();
          for (const e of userEntries) {
            userEntryMap.set(e.media_id, { id: e.id, status: e.status });
          }

          for (const c of candidates) {
            const mId = mediaIdMap.get(`${c.provider}:${c.externalId}`);
            if (mId && userEntryMap.has(mId)) {
              const match = userEntryMap.get(mId)!;
              c.inLibrary = true;
              c.libraryEntryId = match.id;
              c.libraryStatus = match.status as any;
            }
          }
        }
      }
    }

    return jsonResponse(
      {
        success: true,
        candidates: candidates.slice(0, 5),
        exactMatch: false,
      },
      200,
      origin
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return errorResponse(msg, 500, origin);
  }
}
