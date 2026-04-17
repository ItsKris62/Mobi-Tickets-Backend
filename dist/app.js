"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastSSENotification = exports.sendSSENotification = void 0;
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
const notification_routes_1 = tslib_1.__importDefault(require("./modules/notifications/notification.routes"));
const flashsales_routes_1 = tslib_1.__importDefault(require("./modules/flashsales/flashsales.routes"));
const webhooks_routes_1 = tslib_1.__importDefault(require("./modules/webhooks/webhooks.routes"));
const organizer_routes_1 = tslib_1.__importDefault(require("./modules/organizer/organizer.routes"));
const payments_routes_1 = tslib_1.__importDefault(require("./modules/payments/payments.routes"));
const alerts_routes_1 = tslib_1.__importDefault(require("./modules/alerts/alerts.routes"));
const analytics_routes_1 = tslib_1.__importDefault(require("./modules/tickets/analytics.routes"));
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
        files: 3,
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
fastify.get('/health', async () => {
    let redisStatus = 'unknown';
    try {
        const pong = await redis_1.redis.ping();
        redisStatus = pong === 'PONG' ? 'connected' : 'error';
    }
    catch {
        redisStatus = 'disconnected';
    }
    return {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        env: env_1.envConfig.NODE_ENV,
        services: {
            redis: redisStatus,
        },
    };
});
fastify.register(auth_routes_1.default, { prefix: '/api/auth' });
fastify.register(events_routes_1.default, { prefix: '/api/events' });
fastify.register(tickets_routes_1.default, { prefix: '/api/tickets' });
fastify.register(users_routes_1.default, { prefix: '/api/users' });
fastify.register(admin_routes_1.default, { prefix: '/api/admin' });
fastify.register(notification_routes_1.default, { prefix: '/api/notifications' });
fastify.register(flashsales_routes_1.default, { prefix: '/api/flash-sales' });
fastify.register(organizer_routes_1.default, { prefix: '/api/organizer' });
fastify.register(payments_routes_1.default, { prefix: '/api/payments' });
fastify.register(alerts_routes_1.default, { prefix: '/api/admin/alerts' });
fastify.register(analytics_routes_1.default, { prefix: '/api/analytics' });
fastify.register(webhooks_routes_1.default, { prefix: '/api/webhooks' });
const sseConnections = new Map();
fastify.register(async (instance) => {
    instance.get('/api/sse/notifications', {
        preHandler: [instance.authenticate],
    }, async (request, reply) => {
        const userId = request.user.id;
        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'X-Accel-Buffering': 'no',
        });
        if (!sseConnections.has(userId)) {
            sseConnections.set(userId, new Set());
        }
        sseConnections.get(userId).add(reply.raw);
        reply.raw.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);
        const pingInterval = setInterval(() => {
            try {
                reply.raw.write(`: ping\n\n`);
            }
            catch {
                clearInterval(pingInterval);
            }
        }, 30000);
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
        return reply;
    });
});
const sendSSENotification = (userId, data) => {
    const userConnections = sseConnections.get(userId);
    if (userConnections) {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        userConnections.forEach((stream) => {
            try {
                stream.write(message);
            }
            catch {
            }
        });
    }
};
exports.sendSSENotification = sendSSENotification;
const broadcastSSENotification = (data) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    sseConnections.forEach((connections) => {
        connections.forEach((stream) => {
            try {
                stream.write(message);
            }
            catch {
            }
        });
    });
};
exports.broadcastSSENotification = broadcastSSENotification;
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
        if (prisma_1.prisma) {
            await prisma_1.prisma.$disconnect();
            fastify.log.info('Database connection closed');
        }
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