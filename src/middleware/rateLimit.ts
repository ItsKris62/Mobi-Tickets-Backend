// src/middleware/rateLimit.ts
import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { envConfig } from '../config/env';

export default async (fastify: FastifyInstance) => {
  await fastify.register(rateLimit, {
    max: envConfig.RATE_LIMIT_MAX,
    timeWindow: envConfig.RATE_LIMIT_WINDOW_MS,
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({ error: 'Too many requests, try again later' }),
  });
};