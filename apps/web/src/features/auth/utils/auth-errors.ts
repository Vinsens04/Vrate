/**
 * Maps Supabase Auth errors and general errors into safe, user-friendly Bahasa Indonesia messages.
 * Prevents leaking sensitive internals or user enumeration.
 */
export function mapAuthError(error: unknown): string {
  if (!error) {
    return 'Terjadi kesalahan. Silakan coba lagi.';
  }

  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : '';

  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Email atau kata sandi yang Anda masukkan salah.';
  }

  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'Email ini sudah terdaftar. Silakan masuk menggunakan akun Anda.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Email Anda belum dikonfirmasi. Silakan periksa tautan konfirmasi di kotak masuk email Anda.';
  }

  if (lower.includes('password') && (lower.includes('least') || lower.includes('short'))) {
    return 'Kata sandi harus terdiri dari minimal 8 karakter.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('once every 60 seconds')) {
    return 'Terlalu banyak permintaan dalam waktu singkat. Demi keamanan, silakan tunggu beberapa menit sebelum mencoba kembali.';
  }

  if (lower.includes('token has expired') || lower.includes('otp expired') || lower.includes('invalid token')) {
    return 'Tautan verifikasi atau pemulihan telah kedaluwarsa atau sudah digunakan. Silakan minta tautan baru.';
  }

  if (lower.includes('auth session missing') || lower.includes('session expired')) {
    return 'Sesi Anda telah kedaluwarsa. Silakan masuk kembali.';
  }

  if (lower.includes('network') || lower.includes('fetch failed')) {
    return 'Gagal terhubung ke server autentikasi. Pastikan koneksi internet Anda stabil.';
  }

  if (lower.includes('missing or invalid public configuration') || lower.includes('supabase client config error')) {
    return 'Koneksi database Supabase belum dikonfigurasi. Silakan atur NEXT_PUBLIC_SUPABASE_URL dan anon key.';
  }

  return 'Gagal memproses permintaan autentikasi. Silakan coba beberapa saat lagi.';
}
