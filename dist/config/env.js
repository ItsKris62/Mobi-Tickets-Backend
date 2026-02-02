"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envConfig = void 0;
const tslib_1 = require("tslib");
const zod_1 = require("zod");
const dotenv_1 = require("dotenv");
const path_1 = tslib_1.__importDefault(require("path"));
(0, dotenv_1.config)({
    path: path_1.default.resolve(process.cwd(), '.env'),
});
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: zod_1.z.string().min(1, 'REDIS_URL is required'),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRATION: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRATION: zod_1.z.string().default('7d'),
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
    CLOUDINARY_API_KEY: zod_1.z.string().min(1, 'CLOUDINARY_API_KEY is required'),
    CLOUDINARY_API_SECRET: zod_1.z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
    CLOUDINARY_UPLOAD_PRESET: zod_1.z.string().default('mobitickets'),
    PORT: zod_1.z.coerce.number().default(3000),
    RATE_LIMIT_MAX: zod_1.z.coerce.number().default(100),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().default(60000),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:3000'),
    CORS_CREDENTIALS: zod_1.z.coerce.boolean().default(true),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().default(587),
    SMTP_SECURE: zod_1.z.coerce.boolean().default(false),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().default('noreply@mobitickets.com'),
});
const env = envSchema.safeParse(process.env);
if (!env.success) {
    console.error('❌ Invalid environment variables:');
    env.error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
}
exports.envConfig = env.data;
//# sourceMappingURL=env.js.map