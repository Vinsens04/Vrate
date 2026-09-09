import { z } from 'zod';

export const anilistTitleSchema = z.object({
  userPreferred: z.string().optional().nullable(),
  romaji: z.string().optional().nullable(),
  english: z.string().optional().nullable(),
  native: z.string().optional().nullable(),
});

export const anilistCoverImageSchema = z.object({
  extraLarge: z.string().optional().nullable(),
  large: z.string().optional().nullable(),
  medium: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export const anilistFuzzyDateSchema = z.object({
  year: z.number().optional().nullable(),
  month: z.number().optional().nullable(),
  day: z.number().optional().nullable(),
});

export const anilistMediaItemSchema = z.object({
  id: z.number(),
  format: z.string().optional().nullable(),
  title: anilistTitleSchema.optional().default({}),
  description: z.string().optional().nullable(),
  coverImage: anilistCoverImageSchema.optional().nullable(),
  bannerImage: z.string().optional().nullable(),
  startDate: anilistFuzzyDateSchema.optional().nullable(),
  episodes: z.number().optional().nullable(),
  duration: z.number().optional().nullable(),
  genres: z.array(z.string()).optional().nullable(),
  averageScore: z.number().optional().nullable(),
  isAdult: z.boolean().optional().nullable(),
  status: z.string().optional().nullable(),
});

export const anilistPageInfoSchema = z.object({
  total: z.number().optional().nullable(),
  currentPage: z.number().optional().nullable(),
  lastPage: z.number().optional().nullable(),
  hasNextPage: z.boolean().optional().nullable(),
  perPage: z.number().optional().nullable(),
});

export const anilistSearchResponseSchema = z.object({
  data: z
    .object({
      Page: z
        .object({
          pageInfo: anilistPageInfoSchema.optional().nullable(),
          media: z.array(anilistMediaItemSchema.nullable()).optional().nullable(),
        })
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
  errors: z
    .array(
      z.object({
        message: z.string(),
        status: z.number().optional(),
      })
    )
    .optional(),
});

export const anilistDetailResponseSchema = z.object({
  data: z
    .object({
      Media: anilistMediaItemSchema.optional().nullable(),
    })
    .optional()
    .nullable(),
  errors: z
    .array(
      z.object({
        message: z.string(),
        status: z.number().optional(),
      })
    )
    .optional(),
});
