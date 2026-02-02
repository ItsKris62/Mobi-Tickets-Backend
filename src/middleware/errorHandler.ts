// src/middleware/errorHandler.ts
import { FastifyInstance, FastifyReply, FastifyRequest, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { envConfig } from '../config/env';

export default async (fastify: FastifyInstance) => {
  fastify.setErrorHandler(
    async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      // ────────────────────────────────────────────────
      // Log Error with Request Context
      // ────────────────────────────────────────────────
      fastify.log.error({
        err: error,
        req: {
          method: request.method,
          url: request.url,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        },
      }, 'Request error occurred');

      // ────────────────────────────────────────────────
      // Zod Validation Errors (400)
      // ────────────────────────────────────────────────
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        });
      }

      // ────────────────────────────────────────────────
      // Fastify Validation Errors (400)
      // ────────────────────────────────────────────────
      if (error.validation) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: error.validation,
        });
      }

      // ────────────────────────────────────────────────
      // JWT/Authentication Errors (401)
      // ────────────────────────────────────────────────
      if (
        error.statusCode === 401 ||
        error.name === 'UnauthorizedError' ||
        error.message?.toLowerCase().includes('jwt') ||
        error.message?.toLowerCase().includes('token')
      ) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or missing authentication token',
        });
      }

      // ────────────────────────────────────────────────
      // Forbidden Errors (403)
      // ────────────────────────────────────────────────
      if (error.statusCode === 403) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: error.message || 'You do not have permission to access this resource',
        });
      }

      // ────────────────────────────────────────────────
      // Not Found Errors (404)
      // ────────────────────────────────────────────────
      if (error.statusCode === 404) {
        return reply.status(404).send({
          error: 'Not found',
          message: error.message || 'Resource not found',
        });
      }

      // ────────────────────────────────────────────────
      // Rate Limit Errors (429)
      // ────────────────────────────────────────────────
      if (error.statusCode === 429) {
        return reply.status(429).send({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: reply.getHeader('Retry-After') || '60',
        });
      }

      // ────────────────────────────────────────────────
      // Custom Application Errors (with statusCode)
      // ────────────────────────────────────────────────
      if ((error as any).statusCode && (error as any).statusCode >= 400 && (error as any).statusCode < 500) {
        return reply.status((error as any).statusCode).send({
          error: error.message || 'Bad request',
        });
      }

      // ────────────────────────────────────────────────
      // Internal Server Errors (500)
      // ────────────────────────────────────────────────
      const isProduction = envConfig.NODE_ENV === 'production';
      
      return reply.status(error.statusCode || 500).send({
        error: 'Internal server error',
        message: isProduction 
          ? 'An unexpected error occurred. Please try again later.' 
          : error.message,
        // Only include stack trace in development
        ...(isProduction ? {} : { stack: error.stack }),
      });
    }
  );
};