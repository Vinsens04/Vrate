import { getCorsHeaders } from './cors.ts';

export function jsonResponse<T>(
  data: T,
  status = 200,
  origin: string | null = null
): Response {
  const cors = getCorsHeaders(origin);
  return Response.json(data, {
    status,
    headers: {
      ...cors,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export function errorResponse(
  error: string,
  status = 400,
  origin: string | null = null
): Response {
  const cors = getCorsHeaders(origin);
  return Response.json(
    { error },
    {
      status,
      headers: {
        ...cors,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
