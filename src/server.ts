// src/server.ts
// Entry point – starts the Fastify server

import fastify from './app';
import { envConfig } from './config/env';

const start = async () => {
  try {
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
    fastify.log.error({ err }, 'Failed to start server:');
    process.exit(1);
  }
};

start();