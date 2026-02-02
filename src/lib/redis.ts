// src/lib/redis.ts
import Redis from 'ioredis';
import { envConfig } from '../config/env';

export const redis = new Redis(envConfig.REDIS_URL, {
  maxRetriesPerRequest: null, // BullMQ recommends this
  enableOfflineQueue: false,
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await redis.quit();
});

// Optional: BullMQ queue setup (for ticket drops, emails, etc.)
import { Queue } from 'bullmq';

export const ticketQueue = new Queue('ticket-processing', {
  connection: redis,
});

// Example usage later: ticketQueue.add('reserve-ticket', { ticketId, userId });