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
    const rawSearchTitle = titleHint?.trim() || '';
    if (!rawSearchTitle || rawSearchTitle.length < 2) {
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

    const { primary: cleanPrimary, base: cleanBase, year: queryYear } = cleanSearchTitle(rawSearchTitle);
    const searchTitle = cleanPrimary.length >= 2 ? cleanPrimary : rawSearchTitle;

    const candidates: ResolvedMediaItem[] = [];
    const seenExternal = new Set<string>();

    const queriesToTry = [searchTitle];
    if (cleanBase && cleanBase.length >= 2 && cleanBase.toLowerCase() !== searchTitle.toLowerCase()) {
      queriesToTry.push(cleanBase);
    }

    // 1. Search local catalog first across queries
    for (const query of queriesToTry) {
      if (candidates.length >= 5) break;

      const { data: localItems } = await adminClient
        .from('media')
        .select('id, media_type, title, original_title, overview, poster_url, backdrop_url, release_year, total_episodes, media_external_ids(provider, external_id)')
        .ilike('title', `%${query}%`)
        .limit(5);

      if (localItems) {
        for (const item of localItems) {
          if (candidates.length >= 5) break;
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
              matchScore: computeMatchScore(item, searchTitle, queryYear),
            });
          }
        }
      }
    }

    // 2. Query AniList upstream search
    for (const query of queriesToTry) {
      if (candidates.length >= 5) break;
      try {
        const anilistRes = await searchAniList(query, 1);
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
                matchScore: computeMatchScore(aniItem, searchTitle, queryYear),
              });
            }
          }
        }
      } catch {
        // Non-fatal
      }
    }

    // 3. Query TMDB upstream search
    if (isTmdbConfigured()) {
      for (const query of queriesToTry) {
        if (candidates.length >= 5) break;
        try {
          const tmdbRes = await searchTmdb(query, 1);
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
                  matchScore: computeMatchScore(tmdbItem, searchTitle, queryYear),
                });
              }
            }
          }
        } catch {
          // Non-fatal
        }
      }
    }

    // 4. Sort candidates by matchScore descending
    candidates.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

    // 5. For any external items added from upstream search, check if user library has them
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

    const finalCandidates = candidates.slice(0, 5);
    const topMatch = finalCandidates[0];
    const exactMatch = Boolean(
      topMatch && (
        (topMatch.matchScore ?? 0) >= 0.85 ||
        finalCandidates.length === 1
      )
    );

    return jsonResponse(
      {
        success: true,
        candidates: finalCandidates,
        exactMatch,
        cleanedTitle: searchTitle,
      },
      200,
      origin
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return errorResponse(msg, 500, origin);
  }
}

/**
 * Cleans a raw webpage title defensively for catalog resolution.
 * Strips episode numbers, video quality tags, subtitle tags, and site branding.
 */
function cleanSearchTitle(rawTitle: string): { primary: string; base: string | null; year: number | null } {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return { primary: '', base: null, year: null };
  }

  let cleaned = rawTitle.trim();
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Extract 4-digit release year if present e.g. (2023) or 2024
  let year: number | null = null;
  const yearMatch = cleaned.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    if (y >= 1900 && y <= 2100) year = y;
  }

  // Remove leading action verbs: e.g. "Watch", "Nonton", "Streaming", "Download"
  cleaned = cleaned.replace(/^(?:watch\s+(?:online|free\s+online|free)?|nonton\s+(?:anime|streaming|gratis|film)?|streaming\s+|stream\s+|download\s+|unduh\s+)\s*/i, '');

  // Remove common site branding suffixes: e.g. "- Anoboy", "| Otakudesu", etc.
  cleaned = cleaned.replace(/[-–—|/•~_:]\s*(?:miruro|bilibili|iqiyi|crunchyroll|vidio|viu|hotstar|wetv|anoboy|samehadaku|otakudesu|kuramanime|loklok|rebahin|indoxxi|lk21|layarkaca21|dramacute|bioskopkeren|gomunime|anichin|oploverz|komikcast|melongmovie|dutafilm|pahe|zero|kissasian|gogoanime|aniwave)\b.*$/i, '');

  // Remove video quality keywords: e.g. 1080p, 720p, BluRay, Web-DL, x264, x265
  cleaned = cleaned.replace(/\b(?:1080p|720p|480p|360p|4k|2160p|hd|fhd|uhd|bluray|bd|web-dl|webrip|hdrip|dvdrip|x264|x265|hevc|aac|10bit)\b/gi, '');

  // Remove bracketed content: e.g. [1080p], [Sub Indo]
  cleaned = cleaned.replace(/\[[^\]]*\]/g, '');

  // Remove episode and season indicators: e.g. "Episode 1120", "S02E05", "Ep 04"
  cleaned = cleaned.replace(/\b(?:season|s)\s*\d+\s*[-–—|:]?\s*(?:episode|ep|eps|e)\s*\d+\b/gi, '');
  cleaned = cleaned.replace(/\b(?:episode|ep|eps|e)\.?\s*\d+\b/gi, '');
  cleaned = cleaned.replace(/\b(?:season|s)\.?\s*\d+\b/gi, '');

  // Remove subtitle / dub / language markers
  cleaned = cleaned.replace(/\b(?:sub(?:title)?\s+indo(?:nesia)?|sub\s+indo|english\s+sub(?:bed)?|eng\s+sub|raw|dub(?:bed)?|full\s+movie|movie\s+lengkap|terbaru|gratis)\b/gi, '');

  // Remove non-year parentheses: e.g. "(Full Movie)" but keep "(2023)"
  cleaned = cleaned.replace(/\((?!(?:19\d\d|20\d\d)\))[^)]*\)/g, '');

  // Remove trailing/leading delimiters and excessive whitespace
  cleaned = cleaned.replace(/^[-–—|/•~_:,;]+/, '').replace(/[-–—|/•~_:,;]+$/, '').replace(/\s+/g, ' ').trim();

  // Fallback to rawTitle without HTML if over-stripped
  const primary = cleaned.length >= 2 ? cleaned : rawTitle.replace(/<[^>]*>/g, '').trim();

  // Derive base title (before delimiters like ":" or "-")
  let base: string | null = null;
  const splitDelimiter = primary.split(/[:–—\-]/)[0]?.trim();
  if (splitDelimiter && splitDelimiter.length >= 2 && splitDelimiter.toLowerCase() !== primary.toLowerCase()) {
    base = splitDelimiter;
  }

  return { primary, base, year };
}

/**
 * Calculates a match score [0.0 - 1.0] comparing a candidate with query.
 */
function computeMatchScore(
  candidate: { title: string; originalTitle?: string | null; releaseYear?: number | null },
  searchQuery: string,
  targetYear?: number | null
): number {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const queryNorm = clean(searchQuery);
  const titleNorm = clean(candidate.title);
  const origNorm = candidate.originalTitle ? clean(candidate.originalTitle) : '';

  let score = 0.5;

  if (titleNorm === queryNorm || origNorm === queryNorm) {
    score = 1.0;
  } else if (titleNorm.startsWith(queryNorm) || queryNorm.startsWith(titleNorm)) {
    score = 0.88;
  } else {
    // Token set overlap
    const qTokens = new Set(queryNorm.split(' ').filter(Boolean));
    const tTokens = new Set(titleNorm.split(' ').filter(Boolean));
    let matchCount = 0;
    for (const t of qTokens) {
      if (tTokens.has(t)) matchCount++;
    }
    const overlap = qTokens.size > 0 ? matchCount / qTokens.size : 0;
    score = 0.4 + overlap * 0.45;
  }

  // Year boost
  if (targetYear && candidate.releaseYear && targetYear === candidate.releaseYear) {
    score = Math.min(1.0, score + 0.08);
  }

  return Math.round(score * 100) / 100;
}
