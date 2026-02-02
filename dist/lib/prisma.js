"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const env_1 = require("../config/env");
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        log: env_1.envConfig.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
if (env_1.envConfig.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
process.on('beforeExit', async () => {
    await exports.prisma.$disconnect();
});
//# sourceMappingURL=prisma.js.map