import { z } from 'zod';
import { LIBRARY_STATUSES } from '@vrate/shared';

export const libraryStatusSchema = z.enum(LIBRARY_STATUSES);

export const SORT_OPTIONS = [
  'recent',
  'last_watched',
  'added',
  'title',
  'rating',
  'year',
] as const;

export const sortOptionSchema = z.enum(SORT_OPTIONS);

export const updateStatusSchema = z.object({
  entryId: z.string().uuid('Invalid entry ID'),
  status: libraryStatusSchema,
});

export const updateRatingSchema = z.object({
  entryId: z.string().uuid('Invalid entry ID'),
  rating: z
    .number({ message: 'Rating must be a number' })
    .min(0, 'Rating must be at least 0')
    .max(10, 'Rating cannot exceed 10')
    .refine(
      val => Math.round(val * 10) % 5 === 0,
      'Rating must be a multiple of 0.5 (e.g. 7.0, 7.5, 8.0)'
    )
    .nullable(),
});

export const toggleFavoriteSchema = z.object({
  entryId: z.string().uuid('Invalid entry ID'),
  isFavorite: z.boolean(),
});

export const updateNotesSchema = z.object({
  entryId: z.string().uuid('Invalid entry ID'),
  notes: z
    .string()
    .max(2000, 'Notes cannot exceed 2,000 characters')
    .nullable()
    .transform(val => (val && val.trim().length > 0 ? val.trim() : null)),
});

export const deleteEntrySchema = z.object({
  entryId: z.string().uuid('Invalid entry ID'),
});

export const searchParamsSchema = z.object({
  status: z.string().optional(),
  q: z.string().max(100, 'Search query cannot exceed 100 characters').optional(),
  sort: sortOptionSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type UpdateRatingInput = z.infer<typeof updateRatingSchema>;
export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteSchema>;
export type UpdateNotesInput = z.infer<typeof updateNotesSchema>;
export type DeleteEntryInput = z.infer<typeof deleteEntrySchema>;
