import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    fullName: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<{
        ATTENDEE: "ATTENDEE";
        ORGANIZER: "ORGANIZER";
    }>>;
    phoneNumber: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<Date | undefined, string | undefined>>;
    idNumber: z.ZodOptional<z.ZodString>;
    county: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    emergencyContact: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        phoneNumber: z.ZodString;
        relationship: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
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
    fullName: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodString>;
    phoneNumber: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodOptional<z.ZodString>;
    county: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    isVerified: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const authResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
        role: z.ZodString;
        fullName: z.ZodOptional<z.ZodString>;
        avatarUrl: z.ZodOptional<z.ZodString>;
        phoneNumber: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodString>;
        isVerified: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const resetPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export declare const logoutSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const validateTokenResponseSchema: z.ZodObject<{
    valid: z.ZodBoolean;
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        role: z.ZodString;
        fullName: z.ZodOptional<z.ZodString>;
        avatarUrl: z.ZodOptional<z.ZodString>;
        isVerified: z.ZodOptional<z.ZodBoolean>;
        isBanned: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
//# sourceMappingURL=auth.schema.d.ts.map