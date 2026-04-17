"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTokenResponseSchema = exports.logoutSchema = exports.resetPasswordSchema = exports.authResponseSchema = exports.userResponseSchema = exports.walletLoginSchema = exports.refreshSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const roleEnum = zod_1.z.enum(['ATTENDEE', 'ORGANIZER']);
const kenyanPhoneRegex = /^\+254[1-9]\d{8}$/;
const emergencyContactSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Emergency contact name is required'),
    phoneNumber: zod_1.z.string().regex(kenyanPhoneRegex, 'Invalid Kenyan phone number format (+254XXXXXXXXX)'),
    relationship: zod_1.z.string().optional(),
}).optional();
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    fullName: zod_1.z.string().min(1, 'Full name is required'),
    role: roleEnum.default('ATTENDEE'),
    phoneNumber: zod_1.z.string()
        .regex(kenyanPhoneRegex, 'Invalid Kenyan phone number format (+254XXXXXXXXX)')
        .optional(),
    dateOfBirth: zod_1.z.string()
        .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid date format')
        .optional()
        .transform((val) => val ? new Date(val) : undefined),
    idNumber: zod_1.z.string()
        .min(5, 'ID number must be at least 5 characters')
        .max(20, 'ID number must not exceed 20 characters')
        .optional(),
    county: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    emergencyContact: emergencyContactSchema,
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.walletLoginSchema = zod_1.z.object({
    address: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    signature: zod_1.z.string().min(1, 'Signature is required'),
    message: zod_1.z.string().min(1, 'Message is required'),
    nonce: zod_1.z.string().min(1, 'Nonce is required'),
    timestamp: zod_1.z.number().int().positive('Timestamp must be a positive integer'),
});
exports.userResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    role: zod_1.z.string(),
    fullName: zod_1.z.string().optional(),
    avatarUrl: zod_1.z.string().optional(),
    phoneNumber: zod_1.z.string().optional(),
    dateOfBirth: zod_1.z.string().optional(),
    county: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    isVerified: zod_1.z.boolean().optional(),
});
exports.authResponseSchema = zod_1.z.object({
    accessToken: zod_1.z.string(),
    refreshToken: zod_1.z.string(),
    user: zod_1.z.object({
        id: zod_1.z.string(),
        email: zod_1.z.string().optional(),
        role: zod_1.z.string(),
        fullName: zod_1.z.string().optional(),
        avatarUrl: zod_1.z.string().optional(),
        phoneNumber: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        isVerified: zod_1.z.boolean().optional(),
    }),
});
exports.resetPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
});
exports.logoutSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.validateTokenResponseSchema = zod_1.z.object({
    valid: zod_1.z.boolean(),
    user: zod_1.z.object({
        id: zod_1.z.string(),
        email: zod_1.z.string(),
        role: zod_1.z.string(),
        fullName: zod_1.z.string().optional(),
        avatarUrl: zod_1.z.string().optional(),
        isVerified: zod_1.z.boolean().optional(),
        isBanned: zod_1.z.boolean().optional(),
    }),
});
//# sourceMappingURL=auth.schema.js.map