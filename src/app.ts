// src/app.ts
// Main Fastify application setup – registers plugins, middleware, modules, and global behaviors

import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import underPressure from '@fastify/under-pressure';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { envConfig } from './config/env';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import errorHandlerPlugin from './middleware/errorHandler';
import authPlugin from './middleware/auth';

// Import domain modules (routes)
import authRoutes from './modules/auth/auth.routes';
import eventsRoutes from './modules/events/events.routes';
import ticketsRoutes from './modules/tickets/tickets.routes';
import usersRoutes from './modules/users/users.routes';
import adminRoutes from './modules/admin/admin.routes';

// ────────────────────────────────────────────────
// Create Fastify instance with Zod Type Provider
// ────────────────────────────────────────────────
const fastify: FastifyInstance = Fastify({
  logger: {
    level: envConfig.NODE_ENV === 'production' ? 'info' : 'debug',
  },
  trustProxy: true, // Important when behind reverse proxy / load balancer
}).withTypeProvider<ZodTypeProvider>();

// Set Zod as the validator and serializer compiler
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// ────────────────────────────────────────────────
// Global Plugins & Security Headers
// ────────────────────────────────────────────────

// CORS - Enable frontend integration
fastify.register(cors, {
  origin: envConfig.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  credentials: envConfig.CORS_CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
});

// Helmet - Security headers (CSP relaxed for CDN resources)
fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'https:'],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Rate limiting (global baseline – can be overridden per route)
fastify.register(rateLimit, {
  max: envConfig.RATE_LIMIT_MAX,
  timeWindow: envConfig.RATE_LIMIT_WINDOW_MS,
  keyGenerator: (req) => req.ip,
  allowList: [], // Add IPs to bypass if needed (e.g., internal monitoring)
});

// JWT plugin – used for signing/verifying tokens
fastify.register(jwt, {
  secret: envConfig.JWT_SECRET,
  sign: {
    expiresIn: envConfig.JWT_ACCESS_EXPIRATION,
  },
  verify: {
    maxAge: envConfig.JWT_ACCESS_EXPIRATION,
  },
});

// Multipart support for file uploads (event posters, avatars, etc.)
fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 2, // max 2 files per request (poster + trailer)
  },
});

// Under-pressure – protects from overload / DDoS
fastify.register(underPressure, {
  maxEventLoopDelay: 1000,
  maxHeapUsedBytes: 100 * 1024 * 1024,
  maxRssBytes: 200 * 1024 * 1024,
  retryAfter: 5000,
});

// ────────────────────────────────────────────────
// Middleware & Decorators
// ────────────────────────────────────────────────
fastify.register(authPlugin);           // Adds fastify.authenticate decorator
fastify.register(errorHandlerPlugin);   // Global error handler

// ────────────────────────────────────────────────
// Health Check Endpoint
// ────────────────────────────────────────────────
fastify.get('/health', async () => ({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
  env: envConfig.NODE_ENV,
}));

// ────────────────────────────────────────────────
// Register Domain Modules (with prefixes)
// ────────────────────────────────────────────────
fastify.register(authRoutes,    { prefix: '/api/auth' });
fastify.register(eventsRoutes,  { prefix: '/api/events' });
fastify.register(ticketsRoutes, { prefix: '/api/tickets' });
fastify.register(usersRoutes,   { prefix: '/api/users' });
fastify.register(adminRoutes,   { prefix: '/api/admin' });

// ────────────────────────────────────────────────
// Catch-all 404 Handler
// ────────────────────────────────────────────────
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    error: 'Route not found',
    path: request.url,
    method: request.method,
  });
});

// ────────────────────────────────────────────────
// Graceful Shutdown Hooks
// ────────────────────────────────────────────────
const shutdown = async (signal: string): Promise<void> => {
  fastify.log.info(`Received ${signal}. Initiating graceful shutdown...`);

  try {
    // Stop accepting new connections
    await fastify.close();
    fastify.log.info('HTTP server closed');

    // Close database connections
    await prisma.$disconnect();
    fastify.log.info('Database connection closed');

    // Close Redis connection
    await redis.quit();
    fastify.log.info('Redis connection closed');

    fastify.log.info('✅ Server shutdown complete');
    process.exit(0);
  } catch (err) {
    fastify.log.error({ err }, '❌ Error during shutdown');
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  fastify.log.fatal({ err }, '💥 Uncaught Exception');
  void shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  fastify.log.fatal({ reason, promise }, '💥 Unhandled Promise Rejection');
  void shutdown('UNHANDLED_REJECTION');
});

export default fastify;