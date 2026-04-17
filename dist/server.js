"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
const prisma_1 = require("./lib/prisma");
const redis_1 = require("./lib/redis");
const start = async () => {
    try {
        console.log('🚀 Starting MobiTickets Backend...\n');
        console.log('🔌 Testing Upstash Redis connection...');
        const redisConnected = await (0, redis_1.testRedisConnection)();
        if (redisConnected) {
            console.log('✅ Upstash Redis connected successfully\n');
        }
        else {
            console.warn('⚠️  Upstash Redis connection test failed - server will continue but Redis features may not work\n');
        }
        await (0, prisma_1.initializePrisma)();
        console.log('');
        const { default: fastify } = await Promise.resolve().then(() => __importStar(require('./app')));
        await fastify.listen({
            port: env_1.envConfig.PORT,
            host: '0.0.0.0',
        });
        fastify.log.info(`
╔════════════════════════════════════════════════════╗
║             MobiTickets Backend Started            ║
║                                                    ║
║  Environment  : ${env_1.envConfig.NODE_ENV.padEnd(38)} ║
║  Port         : ${String(env_1.envConfig.PORT).padEnd(38)} ║
║  URL          : http://localhost:${env_1.envConfig.PORT}   ║
║  Health check : http://localhost:${env_1.envConfig.PORT}/health ║
╚════════════════════════════════════════════════════╝
    `);
        if (env_1.envConfig.NODE_ENV !== 'production') {
            fastify.log.info('Registered routes:');
            fastify.printRoutes({ commonPrefix: false });
        }
    }
    catch (err) {
        console.error('❌ Failed to start server:', err instanceof Error ? err.message : err);
        if (err instanceof Error && err.stack) {
            console.error(err.stack);
        }
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map