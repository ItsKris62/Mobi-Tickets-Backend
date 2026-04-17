"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.testRedisConnection = testRedisConnection;
const redis_1 = require("@upstash/redis");
const env_1 = require("../config/env");
exports.redis = new redis_1.Redis({
    url: env_1.envConfig.UPSTASH_REDIS_REST_URL,
    token: env_1.envConfig.UPSTASH_REDIS_REST_TOKEN,
});
async function testRedisConnection() {
    try {
        const result = await exports.redis.ping();
        return result === 'PONG';
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Upstash Redis connection test failed:', errorMessage);
        return false;
    }
}
//# sourceMappingURL=redis.js.map