import { z } from 'zod';
import { METADATA_PROVIDERS } from '@vrate/shared';

export const CATALOG_FILTER_TYPES = ['all', 'movie', 'series', 'anime'] as const;
export const CATALOG_SOURCES = ['all', 'tmdb', 'anilist'] as const;
export const INITIAL_LIBRARY_STATUSES = ['watchlist', 'watching', 'completed'] as const;

export const catalogSearchParamSchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, 'Search keyword must be at least 2 characters')
    .max(100, 'Search keyword cannot exceed 100 characters'),
  source: z.enum(CATALOG_SOURCES).default('all'),
  type: z.enum(CATALOG_FILTER_TYPES).default('all'),
  page: z
    .coerce
    .number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .max(50, 'Page cannot exceed 50')
    .default(1),
});

export type CatalogSearchParamInput = z.input<typeof catalogSearchParamSchema>;
export type CatalogSearchParamOutput = z.output<typeof catalogSearchParamSchema>;

export const addToLibrarySchema = z
  .object({
    provider: z.enum(METADATA_PROVIDERS, {
      message: 'Invalid metadata provider (tmdb or anilist)',
    }),
    externalId: z
      .string()
      .trim()
      .regex(/^[0-9]+$/, 'Provider external ID must be a valid number'),
    providerMediaType: z.enum(['movie', 'tv']).optional(),
    initialStatus: z
      .enum(INITIAL_LIBRARY_STATUSES, {
        message: 'Initial status must be watchlist, watching, or completed',
      })
      .default('watchlist'),
  })
  .refine(
    (data) => {
      if (data.provider === 'tmdb' && !data.providerMediaType) {
        return false;
      }
      return true;
    },
    {
      message: 'TMDB provider requires providerMediaType (movie or tv)',
      path: ['providerMediaType'],
    }
  );

export type AddToLibrarySchemaInput = z.input<typeof addToLibrarySchema>;
export type AddToLibrarySchemaOutput = z.output<typeof addToLibrarySchema>;

export const catalogDetailParamSchema = z
  .object({
    provider: z.enum(METADATA_PROVIDERS, {
      message: 'Invalid metadata provider (tmdb or anilist)',
    }),
    externalId: z
      .string()
      .trim()
      .regex(/^[0-9]+$/, 'Provider external ID must be a valid number'),
    type: z.enum(['movie', 'tv']).optional(),
  })
  .refine(
    (data) => {
      if (data.provider === 'tmdb' && !data.type) {
        return false;
      }
      return true;
    },
    {
      message: 'TMDB provider requires type parameter (movie or tv)',
      path: ['type'],
    }
  );

export type CatalogDetailParamInput = z.input<typeof catalogDetailParamSchema>;
