"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const rate_limit_1 = tslib_1.__importDefault(require("@fastify/rate-limit"));
const env_1 = require("../config/env");
exports.default = async (fastify) => {
    await fastify.register(rate_limit_1.default, {
        max: env_1.envConfig.RATE_LIMIT_MAX,
        timeWindow: env_1.envConfig.RATE_LIMIT_WINDOW_MS,
        keyGenerator: (req) => req.ip,
        errorResponseBuilder: () => ({ error: 'Too many requests, try again later' }),
    });
};
//# sourceMappingURL=rateLimit.js.map