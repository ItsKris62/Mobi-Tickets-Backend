"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authResponseSchema = exports.userResponseSchema = exports.walletLoginSchema = exports.refreshSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    fullName: zod_1.z.string().min(1, 'Full name is required'),
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
});
exports.authResponseSchema = zod_1.z.object({
    accessToken: zod_1.z.string(),
    refreshToken: zod_1.z.string(),
    user: zod_1.z.object({
        id: zod_1.z.string(),
        email: zod_1.z.string().optional(),
        role: zod_1.z.string(),
        address: zod_1.z.string().optional(),
    }),
});
//# sourceMappingURL=auth.schema.js.map