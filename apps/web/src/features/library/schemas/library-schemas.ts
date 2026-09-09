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
  entryId: z.string().uuid('ID entri tidak valid'),
  status: libraryStatusSchema,
});

export const updateRatingSchema = z.object({
  entryId: z.string().uuid('ID entri tidak valid'),
  rating: z
    .number({ message: 'Rating harus berupa angka' })
    .min(0, 'Rating minimal 0')
    .max(10, 'Rating maksimal 10')
    .refine(
      val => Math.round(val * 10) % 5 === 0,
      'Rating harus merupakan kelipatan 0.5 (contoh: 7.0, 7.5, 8.0)'
    )
    .nullable(),
});

export const toggleFavoriteSchema = z.object({
  entryId: z.string().uuid('ID entri tidak valid'),
  isFavorite: z.boolean(),
});

export const updateNotesSchema = z.object({
  entryId: z.string().uuid('ID entri tidak valid'),
  notes: z
    .string()
    .max(2000, 'Catatan tidak boleh melebihi 2.000 karakter')
    .nullable()
    .transform(val => (val && val.trim().length > 0 ? val.trim() : null)),
});

export const deleteEntrySchema = z.object({
  entryId: z.string().uuid('ID entri tidak valid'),
});

export const searchParamsSchema = z.object({
  status: z.string().optional(),
  q: z.string().max(100, 'Query pencarian maksimal 100 karakter').optional(),
  sort: sortOptionSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type UpdateRatingInput = z.infer<typeof updateRatingSchema>;
export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteSchema>;
export type UpdateNotesInput = z.infer<typeof updateNotesSchema>;
export type DeleteEntryInput = z.infer<typeof deleteEntrySchema>;
