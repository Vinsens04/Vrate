import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email wajib diisi')
      .email('Format email tidak valid')
      .transform((val) => val.toLowerCase().trim()),
    password: z
      .string()
      .min(8, 'Kata sandi minimal 8 karakter'),
    confirmPassword: z
      .string()
      .min(8, 'Konfirmasi kata sandi minimal 8 karakter'),
    agreeTerms: z
      .boolean()
      .refine((val) => val === true, {
        message: 'Anda harus menyetujui Ketentuan Layanan & Kebijakan Privasi',
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok dengan kata sandi',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(1, 'Kata sandi wajib diisi'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .transform((val) => val.toLowerCase().trim()),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Kata sandi baru minimal 8 karakter'),
    confirmPassword: z
      .string()
      .min(8, 'Konfirmasi kata sandi baru minimal 8 karakter'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
