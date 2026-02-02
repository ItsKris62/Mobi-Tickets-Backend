import { z } from 'zod';

// Zod schemas for validation
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required'),
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
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().optional(),
    role: z.string(),
    address: z.string().optional(),
  }),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;