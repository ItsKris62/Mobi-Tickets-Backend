"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.getPrismaPromise = getPrismaPromise;
exports.initializePrisma = initializePrisma;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const env_1 = require("../config/env");
const globalForPrisma = globalThis;
const CONNECTION_TIMEOUT_MS = 10000;
function withTimeout(promise, ms, errorMessage) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
    ]);
}
async function createPrismaClient() {
    if (globalForPrisma.prisma) {
        return globalForPrisma.prisma;
    }
    console.log('🔌 Connecting to database...');
    try {
        if (!env_1.envConfig.DATABASE_URL) {
            throw new Error('DATABASE_URL is not defined');
        }
        const pool = new pg_1.Pool({
            connectionString: env_1.envConfig.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false,
            },
        });
        const adapter = new adapter_pg_1.PrismaPg(pool);
        const client = new client_1.PrismaClient({
            adapter,
            log: env_1.envConfig.NODE_ENV === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['error'],
        });
        await withTimeout(client.$queryRaw `SELECT 1`, CONNECTION_TIMEOUT_MS, `Database connection timed out after ${CONNECTION_TIMEOUT_MS}ms`);
        console.log('✅ Database connected successfully');
        if (env_1.envConfig.NODE_ENV !== 'production') {
            globalForPrisma.prisma = client;
        }
        return client;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
        console.error('❌ Database connection failed:', errorMessage);
        throw new Error(`Failed to connect to database: ${errorMessage}`);
    }
}
function getPrismaPromise() {
    if (!globalForPrisma.prismaPromise) {
        globalForPrisma.prismaPromise = createPrismaClient();
    }
    return globalForPrisma.prismaPromise;
}
async function initializePrisma() {
    const client = await getPrismaPromise();
    exports.prisma = client;
    return client;
}
process.on('beforeExit', async () => {
    if (globalForPrisma.prisma) {
        console.log('🔌 Disconnecting Prisma...');
        await globalForPrisma.prisma.$disconnect();
    }
});
//# sourceMappingURL=prisma.js.map