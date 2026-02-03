// src/lib/redis.ts
// Upstash Redis client - serverless, HTTP-based Redis
import { Redis } from '@upstash/redis';
import { envConfig } from '../config/env';

// Create Upstash Redis client
// No explicit connect() needed - connects automatically on first command
export const redis = new Redis({
  url: envConfig.UPSTASH_REDIS_REST_URL,
  token: envConfig.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Test Redis connectivity
 * Call this during server startup to verify Upstash is reachable
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Upstash Redis connection test failed:', errorMessage);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: BullMQ queues have been removed
// ─────────────────────────────────────────────────────────────────────────────
// BullMQ requires a persistent TCP connection (ioredis) and does NOT work with
// Upstash's HTTP-based REST API (@upstash/redis).
//
// If you need background job processing, consider these alternatives:
// 1. Upstash QStash - Serverless message queue (https://upstash.com/qstash)
// 2. Use Upstash Redis with @upstash/ratelimit for rate limiting
// 3. Keep a separate local Redis instance just for BullMQ
// 4. Use a different queue service (AWS SQS, Google Cloud Tasks, etc.)
// ─────────────────────────────────────────────────────────────────────────────
