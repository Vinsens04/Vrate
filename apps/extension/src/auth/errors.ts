/**
 * Maps raw Supabase or network error objects to safe, user-friendly Indonesian messages.
 * Never leaks raw secrets, credentials, or internal server dumps.
 */
export function mapExtensionAuthError(error: unknown): string {
  if (!error) {
    return 'Terjadi kesalahan tidak dikenal.';
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid email or password')
  ) {
    return 'Email atau kata sandi tidak valid.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Email belum diverifikasi. Silakan periksa kotak masuk email Anda untuk melakukan konfirmasi.';
  }

  if (
    lower.includes('jwt expired') ||
    lower.includes('token is expired') ||
    lower.includes('session expired') ||
    lower.includes('invalid refresh token') ||
    lower.includes('refresh_token_not_found')
  ) {
    return 'Sesi Anda telah berakhir. Silakan masuk kembali.';
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('networkrequestfailed') ||
    lower.includes('timeout')
  ) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Terlalu banyak percobaan masuk. Silakan tunggu beberapa saat sebelum mencoba lagi.';
  }

  return 'Gagal melakukan autentikasi. Silakan periksa kembali data Anda.';
}
