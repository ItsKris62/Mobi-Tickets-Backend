"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const auth_schema_1 = require("./auth.schema");
const auth_service_1 = require("./auth.service");
const errorResponseSchema = zod_1.z.object({
    error: zod_1.z.string(),
});
exports.default = async (fastify) => {
    const server = fastify.withTypeProvider();
    server.post('/register', {
        schema: {
            description: 'Register a new user with email and password (auto-login)',
            tags: ['auth'],
            body: auth_schema_1.registerSchema,
            response: {
                201: auth_schema_1.authResponseSchema,
                400: errorResponseSchema,
            },
        },
    }, async (request, reply) => {
        try {
            const result = await (0, auth_service_1.registerAndLogin)(request.body, fastify);
            return reply.status(201).send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            return reply.status(400).send({
                error: errorMessage,
            });
        }
    });
    server.post('/login', {
        schema: {
            description: 'Login with email and password',
            tags: ['auth'],
            body: auth_schema_1.loginSchema,
            response: {
                200: auth_schema_1.authResponseSchema,
                401: errorResponseSchema,
            },
        },
    }, async (request, reply) => {
        try {
            const tokens = await (0, auth_service_1.loginUser)(request.body, fastify);
            return reply.send(tokens);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            return reply.status(401).send({
                error: errorMessage,
            });
        }
    });
    server.post('/refresh', {
        schema: {
            description: 'Refresh access token using refresh token',
            tags: ['auth'],
            body: auth_schema_1.refreshSchema,
            response: {
                200: auth_schema_1.authResponseSchema,
                401: errorResponseSchema,
            },
        },
    }, async (request, reply) => {
        try {
            const tokens = await (0, auth_service_1.refreshAccessToken)(request.body, fastify);
            return reply.send(tokens);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
            return reply.status(401).send({
                error: errorMessage,
            });
        }
    });
    server.post('/wallet-login', {
        schema: {
            description: 'Login with Web3 wallet signature',
            tags: ['auth'],
            body: auth_schema_1.walletLoginSchema,
            response: {
                200: auth_schema_1.authResponseSchema,
                401: errorResponseSchema,
            },
        },
    }, async (request, reply) => {
        try {
            const tokens = await (0, auth_service_1.walletLogin)(request.body, fastify);
            return reply.send(tokens);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Wallet login failed';
            return reply.status(401).send({
                error: errorMessage,
            });
        }
    });
    server.post('/reset-password', {
        schema: {
            description: 'Request a password reset link',
            tags: ['auth'],
            body: auth_schema_1.resetPasswordSchema,
            response: {
                200: zod_1.z.object({ message: zod_1.z.string() }),
                400: errorResponseSchema,
            },
        },
    }, async (request, reply) => {
        try {
            const result = await (0, auth_service_1.requestPasswordReset)(request.body);
            return reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
            return reply.status(400).send({ error: errorMessage });
        }
    });
    server.get('/validate', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Validate current JWT token and return fresh user data',
            tags: ['auth'],
            response: {
                200: auth_schema_1.validateTokenResponseSchema,
                401: errorResponseSchema,
            },
        },
    }, async (request, reply) => {
        try {
            const result = await (0, auth_service_1.validateToken)(request.user.id);
            return reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Token validation failed';
            return reply.status(401).send({ error: errorMessage });
        }
    });
    server.post('/logout', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Logout and revoke refresh token',
            tags: ['auth'],
            body: auth_schema_1.logoutSchema,
            response: {
                200: zod_1.z.object({ message: zod_1.z.string() }),
                400: errorResponseSchema,
            },
        },
    }, async (request, reply) => {
        try {
            const result = await (0, auth_service_1.logoutUser)(request.body, request.user.id);
            return reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Logout failed';
            return reply.status(400).send({ error: errorMessage });
        }
    });
};
//# sourceMappingURL=auth.routes.js.map