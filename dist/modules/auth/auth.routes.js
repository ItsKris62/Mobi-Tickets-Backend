"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_schema_1 = require("./auth.schema");
const auth_service_1 = require("./auth.service");
exports.default = async (fastify) => {
    const server = fastify.withTypeProvider();
    server.post('/register', {
        schema: {
            description: 'Register a new user with email and password',
            tags: ['auth'],
            body: auth_schema_1.registerSchema,
            response: {
                201: auth_schema_1.userResponseSchema.extend({
                    message: auth_schema_1.userResponseSchema.shape.id.transform(() => 'User registered successfully'),
                }).partial({ message: true }),
            },
        },
    }, async (request, reply) => {
        try {
            const user = await (0, auth_service_1.registerUser)(request.body, fastify);
            return reply.status(201).send({
                message: 'User registered successfully',
                ...user,
            });
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
};
//# sourceMappingURL=auth.routes.js.map