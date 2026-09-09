import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogDetailView } from '@/features/catalog/components/CatalogDetailView';
import { getCatalogMediaDetail } from '@/features/catalog/queries/catalog-queries';
import { catalogDetailParamSchema } from '@/features/catalog/schemas/catalog-schemas';

interface PageProps {
  params: Promise<{
    provider: string;
    externalId: string;
  }>;
  searchParams: Promise<{
    type?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `Detail Media (${resolvedParams.provider.toUpperCase()}) | Vrate`,
  };
}

export default async function CatalogDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const rawProvider = resolvedParams.provider?.toLowerCase();
  const rawExternalId = resolvedParams.externalId;
  const rawType = resolvedSearchParams.type?.toLowerCase();

  const validation = catalogDetailParamSchema.safeParse({
    provider: rawProvider,
    externalId: rawExternalId,
    type: rawType,
  });

  if (!validation.success) {
    notFound();
  }

  const { provider, externalId, type } = validation.data;

  try {
    const media = await getCatalogMediaDetail({
      provider: provider as 'tmdb' | 'anilist',
      externalId,
      providerMediaType: type as 'movie' | 'tv' | undefined,
    });

    return <CatalogDetailView media={media} />;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Media tidak ditemukan atau gagal dimuat.';
    return (
      <div className="rounded-card border border-app-border bg-app-surface p-8 text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-warning/10 text-brand-warning mx-auto">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-app-text">Gagal Memuat Detail Media</h2>
        <p className="text-xs text-app-muted">{message}</p>
        <div className="pt-2">
          <Link href="/dashboard/discover" className="vr-secondary text-xs px-4 py-2">
            ← Kembali ke Pencarian Temukan
          </Link>
        </div>
      </div>
    );
  }
}
