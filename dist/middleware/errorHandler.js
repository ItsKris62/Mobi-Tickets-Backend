"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const env_1 = require("../config/env");
exports.default = async (fastify) => {
    fastify.setErrorHandler(async (error, request, reply) => {
        fastify.log.error({
            err: error,
            req: {
                method: request.method,
                url: request.url,
                ip: request.ip,
                userAgent: request.headers['user-agent'],
            },
        }, 'Request error occurred');
        if (error instanceof zod_1.ZodError) {
            return reply.status(400).send({
                error: 'Validation failed',
                issues: error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                    code: issue.code,
                })),
            });
        }
        if (error.validation) {
            return reply.status(400).send({
                error: 'Validation failed',
                issues: error.validation,
            });
        }
        if (error.statusCode === 401 ||
            error.name === 'UnauthorizedError' ||
            error.message?.toLowerCase().includes('jwt') ||
            error.message?.toLowerCase().includes('token')) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Invalid or missing authentication token',
            });
        }
        if (error.statusCode === 403) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: error.message || 'You do not have permission to access this resource',
            });
        }
        if (error.statusCode === 404) {
            return reply.status(404).send({
                error: 'Not found',
                message: error.message || 'Resource not found',
            });
        }
        if (error.statusCode === 429) {
            return reply.status(429).send({
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: reply.getHeader('Retry-After') || '60',
            });
        }
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
            return reply.status(error.statusCode).send({
                error: error.message || 'Bad request',
            });
        }
        const isProduction = env_1.envConfig.NODE_ENV === 'production';
        return reply.status(error.statusCode || 500).send({
            error: 'Internal server error',
            message: isProduction
                ? 'An unexpected error occurred. Please try again later.'
                : error.message,
            ...(isProduction ? {} : { stack: error.stack }),
        });
    });
};
//# sourceMappingURL=errorHandler.js.map