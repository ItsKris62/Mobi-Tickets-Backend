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
// Note: Upstash Redis is stateless (HTTP-based) - no connection management needed
import errorHandlerPlugin from './middleware/errorHandler';
import authPlugin from './middleware/auth';

// Import domain modules (routes)
import authRoutes from './modules/auth/auth.routes';
import eventsRoutes from './modules/events/events.routes';
import ticketsRoutes from './modules/tickets/tickets.routes';
import usersRoutes from './modules/users/users.routes';
import adminRoutes from './modules/admin/admin.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import flashSalesRoutes from './modules/flashsales/flashsales.routes';
import webhookRoutes from './modules/webhooks/webhooks.routes';

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
fastify.get('/health', async () => {
  // Test Upstash Redis connectivity
  let redisStatus = 'unknown';
  try {
    const pong = await redis.ping();
    redisStatus = pong === 'PONG' ? 'connected' : 'error';
  } catch {
    redisStatus = 'disconnected';
  }

  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: envConfig.NODE_ENV,
    services: {
      redis: redisStatus,
    },
  };
});

// ────────────────────────────────────────────────
// Register Domain Modules (with prefixes)
// ────────────────────────────────────────────────
fastify.register(authRoutes,    { prefix: '/api/auth' });
fastify.register(eventsRoutes,  { prefix: '/api/events' });
fastify.register(ticketsRoutes, { prefix: '/api/tickets' });
fastify.register(usersRoutes,   { prefix: '/api/users' });
fastify.register(adminRoutes,   { prefix: '/api/admin' });
fastify.register(notificationRoutes, { prefix: '/api/notifications' });
fastify.register(flashSalesRoutes, { prefix: '/api/flash-sales' });

// QStash Webhook endpoints (for background job processing)
// These endpoints are called by Upstash QStash, not by users directly
fastify.register(webhookRoutes, { prefix: '/api/webhooks' });

// ────────────────────────────────────────────────
// Server-Sent Events (SSE) for Real-time Notifications
// ────────────────────────────────────────────────
// Store active SSE connections per user
const sseConnections = new Map<string, Set<NodeJS.WritableStream>>();

// SSE route as a proper plugin (ensures auth plugin is loaded first)
fastify.register(async (instance) => {
  instance.get('/api/sse/notifications', {
    preHandler: [instance.authenticate],
  }, async (request, reply) => {
    const userId = request.user!.id;

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Add connection to the map
    if (!sseConnections.has(userId)) {
      sseConnections.set(userId, new Set());
    }
    sseConnections.get(userId)!.add(reply.raw);

    // Send initial connection message
    reply.raw.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

    // Keep-alive ping every 30 seconds
    const pingInterval = setInterval(() => {
      try {
        reply.raw.write(`: ping\n\n`);
      } catch {
        clearInterval(pingInterval);
      }
    }, 30000);

    // Handle client disconnect
    request.raw.on('close', () => {
      clearInterval(pingInterval);
      const userConnections = sseConnections.get(userId);
      if (userConnections) {
        userConnections.delete(reply.raw);
        if (userConnections.size === 0) {
          sseConnections.delete(userId);
        }
      }
      instance.log.info(`SSE connection closed for user ${userId}`);
    });

    // Don't end the response - keep it open for SSE
    return reply;
  });
});

// Helper function to send SSE notification to a specific user (exported for use in services)
export const sendSSENotification = (userId: string, data: Record<string, unknown>) => {
  const userConnections = sseConnections.get(userId);
  if (userConnections) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    userConnections.forEach((stream) => {
      try {
        stream.write(message);
      } catch {
        // Connection might be closed, ignore
      }
    });
  }
};

// Broadcast to all connected users (for system-wide notifications)
export const broadcastSSENotification = (data: Record<string, unknown>) => {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseConnections.forEach((connections) => {
    connections.forEach((stream) => {
      try {
        stream.write(message);
      } catch {
        // Connection might be closed, ignore
      }
    });
  });
};

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
    if (prisma) {
      await prisma.$disconnect();
      fastify.log.info('Database connection closed');
    }

    // Note: Upstash Redis is stateless (HTTP-based) - no connection to close

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