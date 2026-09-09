import { z } from 'zod';
import { METADATA_PROVIDERS } from '@vrate/shared';

export const CATALOG_FILTER_TYPES = ['all', 'movie', 'series', 'anime'] as const;
export const CATALOG_SOURCES = ['all', 'tmdb', 'anilist'] as const;
export const INITIAL_LIBRARY_STATUSES = ['watchlist', 'watching', 'completed'] as const;

export const catalogSearchParamSchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, 'Kata kunci pencarian minimal 2 karakter')
    .max(100, 'Kata kunci pencarian maksimal 100 karakter'),
  source: z.enum(CATALOG_SOURCES).default('all'),
  type: z.enum(CATALOG_FILTER_TYPES).default('all'),
  page: z
    .coerce
    .number()
    .int('Halaman harus berupa bilangan bulat')
    .min(1, 'Halaman minimal 1')
    .max(50, 'Halaman maksimal 50')
    .default(1),
});

export type CatalogSearchParamInput = z.input<typeof catalogSearchParamSchema>;
export type CatalogSearchParamOutput = z.output<typeof catalogSearchParamSchema>;

export const addToLibrarySchema = z
  .object({
    provider: z.enum(METADATA_PROVIDERS, {
      message: 'Provider metadata tidak valid (tmdb atau anilist)',
    }),
    externalId: z
      .string()
      .trim()
      .regex(/^[0-9]+$/, 'External ID provider harus berupa angka valid'),
    providerMediaType: z.enum(['movie', 'tv']).optional(),
    initialStatus: z
      .enum(INITIAL_LIBRARY_STATUSES, {
        message: 'Status awal harus watchlist, watching, atau completed',
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
      message: 'Provider TMDB memerlukan providerMediaType (movie atau tv)',
      path: ['providerMediaType'],
    }
  );

export type AddToLibrarySchemaInput = z.input<typeof addToLibrarySchema>;
export type AddToLibrarySchemaOutput = z.output<typeof addToLibrarySchema>;

export const catalogDetailParamSchema = z
  .object({
    provider: z.enum(METADATA_PROVIDERS, {
      message: 'Provider metadata tidak valid (tmdb atau anilist)',
    }),
    externalId: z
      .string()
      .trim()
      .regex(/^[0-9]+$/, 'External ID provider harus berupa angka valid'),
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
      message: 'Provider TMDB memerlukan parameter jenis (movie atau tv)',
      path: ['type'],
    }
  );

export type CatalogDetailParamInput = z.input<typeof catalogDetailParamSchema>;
