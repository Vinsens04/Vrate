import { NextRequest, NextResponse } from 'next/server';
import { executeCatalogSearch } from '@/features/catalog/queries/catalog-queries';
import { catalogSearchParamSchema } from '@/features/catalog/schemas/catalog-schemas';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // 1. Authenticate user
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Autentikasi diperlukan untuk mencari katalog.' },
      { status: 401 }
    );
  }

  // 2. Extract and validate parameters
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const source = url.searchParams.get('source') || 'all';
  const type = url.searchParams.get('type') || 'all';
  const page = url.searchParams.get('page') || '1';

  const validation = catalogSearchParamSchema.safeParse({
    q: q || '',
    source,
    type,
    page,
  });

  if (!validation.success) {
    const message = validation.error.issues.map((i) => i.message).join('; ');
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { q: query, source: validSource, type: validType, page: validPage } = validation.data;

  try {
    // 3. Execute federated search
    const searchResult = await executeCatalogSearch({
      query,
      source: validSource,
      filterType: validType,
      page: validPage,
    });

    return NextResponse.json(searchResult, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat mencari.';
    return NextResponse.json(
      {
        error: message,
        results: [],
        providers: {
          tmdb: { configured: false, available: false, hasNextPage: false, error: message },
          anilist: { configured: true, available: false, hasNextPage: false, error: message },
        },
      },
      { status: 500 }
    );
  }
}
