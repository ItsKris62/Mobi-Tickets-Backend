"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fastify_1 = tslib_1.__importDefault(require("fastify"));
const helmet_1 = tslib_1.__importDefault(require("@fastify/helmet"));
const cors_1 = tslib_1.__importDefault(require("@fastify/cors"));
const rate_limit_1 = tslib_1.__importDefault(require("@fastify/rate-limit"));
const jwt_1 = tslib_1.__importDefault(require("@fastify/jwt"));
const multipart_1 = tslib_1.__importDefault(require("@fastify/multipart"));
const under_pressure_1 = tslib_1.__importDefault(require("@fastify/under-pressure"));
const fastify_type_provider_zod_1 = require("fastify-type-provider-zod");
const env_1 = require("./config/env");
const prisma_1 = require("./lib/prisma");
const redis_1 = require("./lib/redis");
const errorHandler_1 = tslib_1.__importDefault(require("./middleware/errorHandler"));
const auth_1 = tslib_1.__importDefault(require("./middleware/auth"));
const auth_routes_1 = tslib_1.__importDefault(require("./modules/auth/auth.routes"));
const events_routes_1 = tslib_1.__importDefault(require("./modules/events/events.routes"));
const tickets_routes_1 = tslib_1.__importDefault(require("./modules/tickets/tickets.routes"));
const users_routes_1 = tslib_1.__importDefault(require("./modules/users/users.routes"));
const admin_routes_1 = tslib_1.__importDefault(require("./modules/admin/admin.routes"));
const fastify = (0, fastify_1.default)({
    logger: {
        level: env_1.envConfig.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    trustProxy: true,
}).withTypeProvider();
fastify.setValidatorCompiler(fastify_type_provider_zod_1.validatorCompiler);
fastify.setSerializerCompiler(fastify_type_provider_zod_1.serializerCompiler);
fastify.register(cors_1.default, {
    origin: env_1.envConfig.CORS_ORIGIN.split(',').map(origin => origin.trim()),
    credentials: env_1.envConfig.CORS_CREDENTIALS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,
});
fastify.register(helmet_1.default, {
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
fastify.register(rate_limit_1.default, {
    max: env_1.envConfig.RATE_LIMIT_MAX,
    timeWindow: env_1.envConfig.RATE_LIMIT_WINDOW_MS,
    keyGenerator: (req) => req.ip,
    allowList: [],
});
fastify.register(jwt_1.default, {
    secret: env_1.envConfig.JWT_SECRET,
    sign: {
        expiresIn: env_1.envConfig.JWT_ACCESS_EXPIRATION,
    },
    verify: {
        maxAge: env_1.envConfig.JWT_ACCESS_EXPIRATION,
    },
});
fastify.register(multipart_1.default, {
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 2,
    },
});
fastify.register(under_pressure_1.default, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 100 * 1024 * 1024,
    maxRssBytes: 200 * 1024 * 1024,
    retryAfter: 5000,
});
fastify.register(auth_1.default);
fastify.register(errorHandler_1.default);
fastify.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: env_1.envConfig.NODE_ENV,
}));
fastify.register(auth_routes_1.default, { prefix: '/api/auth' });
fastify.register(events_routes_1.default, { prefix: '/api/events' });
fastify.register(tickets_routes_1.default, { prefix: '/api/tickets' });
fastify.register(users_routes_1.default, { prefix: '/api/users' });
fastify.register(admin_routes_1.default, { prefix: '/api/admin' });
fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
        error: 'Route not found',
        path: request.url,
        method: request.method,
    });
});
const shutdown = async (signal) => {
    fastify.log.info(`Received ${signal}. Initiating graceful shutdown...`);
    try {
        await fastify.close();
        fastify.log.info('HTTP server closed');
        await prisma_1.prisma.$disconnect();
        fastify.log.info('Database connection closed');
        await redis_1.redis.quit();
        fastify.log.info('Redis connection closed');
        fastify.log.info('✅ Server shutdown complete');
        process.exit(0);
    }
    catch (err) {
        fastify.log.error({ err }, '❌ Error during shutdown');
        process.exit(1);
    }
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    fastify.log.fatal({ err }, '💥 Uncaught Exception');
    void shutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason, promise) => {
    fastify.log.fatal({ reason, promise }, '💥 Unhandled Promise Rejection');
    void shutdown('UNHANDLED_REJECTION');
});
exports.default = fastify;
//# sourceMappingURL=app.js.map