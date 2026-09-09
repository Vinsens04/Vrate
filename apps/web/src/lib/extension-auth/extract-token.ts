export interface ExtractTokenResult {
  success: boolean;
  token?: string;
  error?: string;
  status?: number;
}

/**
 * Extracts and strictly validates Bearer token formatting from the Authorization header.
 * - Rejects missing header
 * - Rejects header > 2048 chars
 * - Rejects non-Bearer schemes (Basic, Token, etc.)
 * - Rejects malformed or whitespace tokens
 */
export function extractBearerToken(authHeader: string | null): ExtractTokenResult {
  if (!authHeader) {
    return {
      success: false,
      error: 'Header Authorization diperlukan.',
      status: 401,
    };
  }

  // Header length limit defense against DOS
  if (authHeader.length > 2048) {
    return {
      success: false,
      error: 'Ukuran header Authorization melebihi batas yang diizinkan.',
      status: 400,
    };
  }

  const match = authHeader.match(/^Bearer\s+([A-Za-z0-9-_=.]+)$/i);
  if (!match || !match[1]) {
    return {
      success: false,
      error: 'Format Authorization harus berupa Bearer <token>.',
      status: 401,
    };
  }

  const token = match[1].trim();
  if (token.length < 10) {
    return {
      success: false,
      error: 'Token Bearer tidak valid.',
      status: 401,
    };
  }

  return {
    success: true,
    token,
  };
}
