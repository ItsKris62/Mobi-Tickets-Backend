"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketQueue = exports.redis = void 0;
const tslib_1 = require("tslib");
const ioredis_1 = tslib_1.__importDefault(require("ioredis"));
const env_1 = require("../config/env");
exports.redis = new ioredis_1.default(env_1.envConfig.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
});
process.on('beforeExit', async () => {
    await exports.redis.quit();
});
const bullmq_1 = require("bullmq");
exports.ticketQueue = new bullmq_1.Queue('ticket-processing', {
    connection: exports.redis,
});
//# sourceMappingURL=redis.js.map