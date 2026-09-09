import { z } from 'zod';

export const EXTENSION_AUTH_STATES = [
  'unconfigured',
  'signed_out',
  'loading',
  'signed_in',
  'expired',
  'offline',
  'error',
] as const;

export const extensionAuthStateSchema = z.enum(EXTENSION_AUTH_STATES);
export type ExtensionAuthState = z.infer<typeof extensionAuthStateSchema>;

export const signInInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Format email tidak valid')
    .max(255, 'Email maksimal 255 karakter'),
  password: z
    .string()
    .min(1, 'Kata sandi tidak boleh kosong')
    .max(255, 'Kata sandi maksimal 255 karakter'),
});

export type SignInInput = z.infer<typeof signInInputSchema>;

export const extensionMessageTypeSchema = z.enum([
  'AUTH_GET_STATE',
  'AUTH_SIGN_IN',
  'AUTH_SIGN_OUT',
  'AUTH_REFRESH',
  'AUTH_GET_PROFILE',
  'OPEN_DASHBOARD',
  'OPEN_URL',
]);

export type ExtensionMessageType = z.infer<typeof extensionMessageTypeSchema>;

export const extensionMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('AUTH_GET_STATE'),
  }),
  z.object({
    type: z.literal('AUTH_SIGN_IN'),
    payload: signInInputSchema,
  }),
  z.object({
    type: z.literal('AUTH_SIGN_OUT'),
  }),
  z.object({
    type: z.literal('AUTH_REFRESH'),
  }),
  z.object({
    type: z.literal('AUTH_GET_PROFILE'),
  }),
  z.object({
    type: z.literal('OPEN_DASHBOARD'),
  }),
  z.object({
    type: z.literal('OPEN_URL'),
    payload: z.object({
      url: z.string().min(1, 'URL tidak boleh kosong'),
    }),
  }),
]);

export type ExtensionMessage = z.infer<typeof extensionMessageSchema>;

export const safeUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export type SafeUser = z.infer<typeof safeUserSchema>;

export const userProfileSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const userSettingsSchema = z.object({
  autoDetect: z.boolean(),
  confirmBeforeTracking: z.boolean(),
  autoTrackProgress: z.boolean(),
  autoCompleteThreshold: z.number(),
  autoAddAfterSeconds: z.number().optional(),
  theme: z.string().optional(),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const extensionAuthResponseSchema = z.object({
  success: z.boolean(),
  state: extensionAuthStateSchema,
  user: safeUserSchema.nullable().optional(),
  profile: userProfileSchema.nullable().optional(),
  settings: userSettingsSchema.nullable().optional(),
  error: z.string().nullable().optional(),
});

export type ExtensionAuthResponse = z.infer<typeof extensionAuthResponseSchema>;
