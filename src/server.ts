// src/server.ts
// Entry point – starts the Fastify server

import { envConfig } from './config/env';
import { initializePrisma } from './lib/prisma';
import { testRedisConnection } from './lib/redis';

const start = async () => {
  try {
    console.log('🚀 Starting MobiTickets Backend...\n');

    // 1. Test Upstash Redis connection (optional - it connects on first command)
    console.log('🔌 Testing Upstash Redis connection...');
    const redisConnected = await testRedisConnection();
    if (redisConnected) {
      console.log('✅ Upstash Redis connected successfully\n');
    } else {
      console.warn('⚠️  Upstash Redis connection test failed - server will continue but Redis features may not work\n');
      // Note: We don't throw here because Upstash is serverless and might work later
    }

    // 2. Initialize database connection
    await initializePrisma();
    console.log('');

    // 3. Import and start Fastify AFTER connections are verified
    // This prevents plugins from loading before DB/Redis are ready
    const { default: fastify } = await import('./app');

    await fastify.listen({
      port: envConfig.PORT,
      host: '0.0.0.0', // Listen on all interfaces (required for Docker / production)
    });

    fastify.log.info(`
╔════════════════════════════════════════════════════╗
║             MobiTickets Backend Started            ║
║                                                    ║
║  Environment  : ${envConfig.NODE_ENV.padEnd(38)} ║
║  Port         : ${String(envConfig.PORT).padEnd(38)} ║
║  URL          : http://localhost:${envConfig.PORT}   ║
║  Health check : http://localhost:${envConfig.PORT}/health ║
╚════════════════════════════════════════════════════╝
    `);

    // Optional: Log registered routes in development
    if (envConfig.NODE_ENV !== 'production') {
      fastify.log.info('Registered routes:');
      fastify.printRoutes({ commonPrefix: false });
    }

  } catch (err) {
    console.error('❌ Failed to start server:', err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
};

start();