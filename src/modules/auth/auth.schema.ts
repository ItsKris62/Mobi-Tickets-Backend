import { z } from 'zod';

// Role enum for validation
const roleEnum = z.enum(['ATTENDEE', 'ORGANIZER']);

// Kenyan phone number regex (+254 followed by 9 digits). Strict: cannot start with 0.
const kenyanPhoneRegex = /^\+254[1-9]\d{8}$/;

// Emergency contact schema
const emergencyContactSchema = z.object({
  name: z.string().min(1, 'Emergency contact name is required'),
  phoneNumber: z.string().regex(kenyanPhoneRegex, 'Invalid Kenyan phone number format (+254XXXXXXXXX)'),
  relationship: z.string().optional(),
}).optional();

// Zod schemas for validation
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  role: roleEnum.default('ATTENDEE'),

  // Kenyan context fields (optional during registration, can be filled later)
  phoneNumber: z.string()
    .regex(kenyanPhoneRegex, 'Invalid Kenyan phone number format (+254XXXXXXXXX)')
    .optional(),
  dateOfBirth: z.string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid date format')
    .optional()
    .transform((val) => val ? new Date(val) : undefined),
  idNumber: z.string()
    .min(5, 'ID number must be at least 5 characters')
    .max(20, 'ID number must not exceed 20 characters')
    .optional(),
  county: z.string().optional(),
  city: z.string().optional(),
  emergencyContact: emergencyContactSchema,
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const walletLoginSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  signature: z.string().min(1, 'Signature is required'),
  message: z.string().min(1, 'Message is required'),
  nonce: z.string().min(1, 'Nonce is required'),
  timestamp: z.number().int().positive('Timestamp must be a positive integer'),
});

// Infer TypeScript types from Zod schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type WalletLoginInput = z.infer<typeof walletLoginSchema>;

// Response schemas (optional but recommended for complete type safety)
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.string(),
  fullName: z.string().optional(),
  avatarUrl: z.string().optional(),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  county: z.string().optional(),
  city: z.string().optional(),
  isVerified: z.boolean().optional(),
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().optional(),
    role: z.string(),
    fullName: z.string().optional(),
    avatarUrl: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(), // Wallet address
    isVerified: z.boolean().optional(),
  }),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const validateTokenResponseSchema = z.object({
  valid: z.boolean(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
    fullName: z.string().optional(),
    avatarUrl: z.string().optional(),
    isVerified: z.boolean().optional(),
    isBanned: z.boolean().optional(),
  }),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;