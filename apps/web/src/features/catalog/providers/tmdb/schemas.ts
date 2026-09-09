import { z } from 'zod';

export const tmdbGenreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const tmdbMultiSearchResultItemSchema = z.object({
  id: z.number(),
  media_type: z.enum(['movie', 'tv', 'person']),
  title: z.string().optional(),
  name: z.string().optional(),
  original_title: z.string().optional().nullable(),
  original_name: z.string().optional().nullable(),
  overview: z.string().optional().nullable(),
  poster_path: z.string().optional().nullable(),
  backdrop_path: z.string().optional().nullable(),
  release_date: z.string().optional().nullable(),
  first_air_date: z.string().optional().nullable(),
  genre_ids: z.array(z.number()).optional(),
  vote_average: z.number().optional().nullable(),
  vote_count: z.number().optional().nullable(),
  adult: z.boolean().optional(),
  popularity: z.number().optional(),
});

export const tmdbMultiSearchResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbMultiSearchResultItemSchema),
  total_pages: z.number(),
  total_results: z.number(),
});

export const tmdbMovieDetailResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string().optional().nullable(),
  overview: z.string().optional().nullable(),
  poster_path: z.string().optional().nullable(),
  backdrop_path: z.string().optional().nullable(),
  release_date: z.string().optional().nullable(),
  runtime: z.number().optional().nullable(),
  genres: z.array(tmdbGenreSchema).optional().default([]),
  vote_average: z.number().optional().nullable(),
  vote_count: z.number().optional().nullable(),
  adult: z.boolean().optional().default(false),
  status: z.string().optional().nullable(),
  tagline: z.string().optional().nullable(),
});

export const tmdbTvDetailResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string().optional().nullable(),
  overview: z.string().optional().nullable(),
  poster_path: z.string().optional().nullable(),
  backdrop_path: z.string().optional().nullable(),
  first_air_date: z.string().optional().nullable(),
  episode_run_time: z.array(z.number()).optional().nullable(),
  number_of_seasons: z.number().optional().default(0),
  number_of_episodes: z.number().optional().default(0),
  genres: z.array(tmdbGenreSchema).optional().default([]),
  vote_average: z.number().optional().nullable(),
  vote_count: z.number().optional().nullable(),
  adult: z.boolean().optional().default(false),
  status: z.string().optional().nullable(),
  tagline: z.string().optional().nullable(),
});
