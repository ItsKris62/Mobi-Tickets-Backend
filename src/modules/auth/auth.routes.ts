import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  walletLoginSchema,
  resetPasswordSchema,
  logoutSchema,
  userResponseSchema,
  authResponseSchema,
  validateTokenResponseSchema,
} from './auth.schema';
import {
  registerUser,
  registerAndLogin,
  loginUser,
  refreshAccessToken,
  walletLogin,
  requestPasswordReset,
  validateToken,
  logoutUser,
} from './auth.service';

// Error response schema for validation
const errorResponseSchema = z.object({
  error: z.string(),
});

export default async (fastify: FastifyInstance) => {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Register (email/password) - auto-login after registration
  server.post(
    '/register',
    {
      schema: {
        description: 'Register a new user with email and password (auto-login)',
        tags: ['auth'],
        body: registerSchema,
        response: {
          201: authResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await registerAndLogin(request.body, fastify);
        return reply.status(201).send(result);
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

  // Password reset request
  server.post(
    '/reset-password',
    {
      schema: {
        description: 'Request a password reset link',
        tags: ['auth'],
        body: resetPasswordSchema,
        response: {
          200: z.object({ message: z.string() }),
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await requestPasswordReset(request.body);
        return reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
        return reply.status(400).send({ error: errorMessage });
      }
    }
  );

  // Validate JWT token
  server.get(
    '/validate',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Validate current JWT token and return fresh user data',
        tags: ['auth'],
        response: {
          200: validateTokenResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await validateToken(request.user!.id);
        return reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Token validation failed';
        return reply.status(401).send({ error: errorMessage });
      }
    }
  );

  // Logout (revoke refresh token)
  server.post(
    '/logout',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Logout and revoke refresh token',
        tags: ['auth'],
        body: logoutSchema,
        response: {
          200: z.object({ message: z.string() }),
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await logoutUser(request.body, request.user!.id);
        return reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Logout failed';
        return reply.status(400).send({ error: errorMessage });
      }
    }
  );
};