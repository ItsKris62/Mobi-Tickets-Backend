import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    fullName: z.ZodString;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const refreshSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const walletLoginSchema: z.ZodObject<{
    address: z.ZodString;
    signature: z.ZodString;
    message: z.ZodString;
    nonce: z.ZodString;
    timestamp: z.ZodNumber;
}, z.core.$strip>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type WalletLoginInput = z.infer<typeof walletLoginSchema>;
export declare const userResponseSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    role: z.ZodString;
}, z.core.$strip>;
export declare const authResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
        role: z.ZodString;
        address: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
//# sourceMappingURL=auth.schema.d.ts.map