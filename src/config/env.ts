// src/config/env.ts
import { z } from 'zod';
import { config } from 'dotenv';
import path from 'path';

// Load .env file (development only; production uses env vars directly)
config({
  path: path.resolve(process.cwd(), '.env'),
});

// Define schema with strict validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database - Support both standard PostgreSQL and Prisma Postgres URLs
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Upstash Redis (serverless, HTTP-based)
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),

  // Upstash QStash (serverless message queue for background jobs)
  QSTASH_TOKEN: z.string().min(1, 'QSTASH_TOKEN is required'),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1, 'QSTASH_CURRENT_SIGNING_KEY is required'),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1, 'QSTASH_NEXT_SIGNING_KEY is required'),

  // Webhook base URL (your public URL that QStash will call)
  // In development, use ngrok or similar tunneling service
  WEBHOOK_BASE_URL: z.string().url().optional(),
  
  // JWT Secrets (ultra-long random strings recommended)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  CLOUDINARY_UPLOAD_PRESET: z.string().default('mobitickets'),
  
  // Server & Rate limiting
  PORT: z.coerce.number().default(3000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000), // 1 minute

  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),

  // Resend Email Configuration
  // Get your API key from: https://resend.com/api-keys
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  // Sender email (must be verified in Resend or use onboarding@resend.dev for testing)
  EMAIL_FROM: z.string().default('MobiTickets <onboarding@resend.dev>'),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error('❌ Invalid environment variables:');
  env.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const envConfig = env.data;

// Type-safe access (no more process.env directly!)
export type EnvConfig = typeof envConfig;