import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  walletLoginSchema,
  userResponseSchema,
  authResponseSchema,
} from './auth.schema';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  walletLogin,
} from './auth.service';

// Error response schema for validation
const errorResponseSchema = z.object({
  error: z.string(),
});

export default async (fastify: FastifyInstance) => {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Register (email/password)
  server.post(
    '/register',
    {
      schema: {
        description: 'Register a new user with email and password',
        tags: ['auth'],
        body: registerSchema,
        response: {
          201: userResponseSchema.extend({
            message: userResponseSchema.shape.id.transform(() => 'User registered successfully'),
          }).partial({ message: true }),
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await registerUser(request.body, fastify);
        return reply.status(201).send({
          message: 'User registered successfully',
          ...user,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Registration failed';
        return reply.status(400).send({
          error: errorMessage,
        });
      }
    }
  );

  // Login (email/password)
  server.post(
    '/login',
    {
      schema: {
        description: 'Login with email and password',
        tags: ['auth'],
        body: loginSchema,
        response: {
          200: authResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const tokens = await loginUser(request.body, fastify);
        return reply.send(tokens);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Login failed';
        return reply.status(401).send({
          error: errorMessage,
        });
      }
    }
  );

  // Refresh token rotation
  server.post(
    '/refresh',
    {
      schema: {
        description: 'Refresh access token using refresh token',
        tags: ['auth'],
        body: refreshSchema,
        response: {
          200: authResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const tokens = await refreshAccessToken(request.body, fastify);
        return reply.send(tokens);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
        return reply.status(401).send({
          error: errorMessage,
        });
      }
    }
  );

  // Wallet login (signature-based)
  server.post(
    '/wallet-login',
    {
      schema: {
        description: 'Login with Web3 wallet signature',
        tags: ['auth'],
        body: walletLoginSchema,
        response: {
          200: authResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const tokens = await walletLogin(request.body, fastify);
        return reply.send(tokens);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Wallet login failed';
        return reply.status(401).send({
          error: errorMessage,
        });
      }
    }
  );
};