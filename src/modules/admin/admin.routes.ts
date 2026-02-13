import { FastifyInstance } from 'fastify';
import { requireRole } from '../../middleware/rbac';
import {
  getDashboardStats,
  getAllUsers,
  banUser,
  getAllEvents,
  getAuditLogs,
  getSystemHealth,
  unbanUser,
  featureEvent,
  getOrganizerRequests,
  reviewOrganizerRequest,
  getRefundRequests,
  reviewRefundRequest,
} from './admin.service';
import { featureEventSchema, reviewRequestSchema } from './admin.schema';

export default async (fastify: FastifyInstance) => {
  // Admin dashboard stats
  fastify.get(
    '/dashboard',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (_request, reply) => {
      try {
        const stats = await getDashboardStats();
        reply.send(stats);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Get all users with pagination
  fastify.get(
    '/users',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const query = request.query as { page?: string; limit?: string };
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '20', 10);
        const result = await getAllUsers(page, limit);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Ban user
  fastify.post(
    '/users/:userId/ban',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const body = request.body as { reason: string };
        const result = await banUser(userId, request.user!.id, body.reason);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(400).send({ error: errorMessage });
      }
    }
  );

  // Get all events for moderation
  fastify.get(
    '/events',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const query = request.query as { page?: string; limit?: string };
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '20', 10);
        const result = await getAllEvents(page, limit);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Get audit logs
  fastify.get(
    '/logs',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const query = request.query as { page?: string; limit?: string };
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '50', 10);
        const result = await getAuditLogs(page, limit);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // System health check
  fastify.get(
    '/health',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (_request, reply) => {
      try {
        const health = await getSystemHealth();
        reply.send(health);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Unban user
  fastify.delete(
    '/users/:userId/ban',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const result = await unbanUser(userId, request.user!.id);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(400).send({ error: errorMessage });
      }
    }
  );

  // Feature/unfeature event
  fastify.put(
    '/events/:eventId/feature',
    { schema: featureEventSchema, preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { eventId } = request.params as { eventId: string };
        const { featured } = request.body as { featured: boolean };
        const result = await featureEvent(eventId, featured, request.user!.id);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Get organizer applications
  fastify.get(
    '/organizer-requests',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const query = request.query as { page?: string; limit?: string };
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '20', 10);
        const result = await getOrganizerRequests(page, limit);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Review organizer application
  fastify.put(
    '/organizer-requests/:requestId',
    { schema: reviewRequestSchema, preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { requestId } = request.params as { requestId: string };
        const { status, notes } = request.body as { status: 'APPROVED' | 'REJECTED'; notes?: string };
        const result = await reviewOrganizerRequest(requestId, request.user!.id, status, notes);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Get refund requests
  fastify.get(
    '/refund-requests',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const query = request.query as { page?: string; limit?: string };
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '20', 10);
        const result = await getRefundRequests(page, limit);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Review refund request
  fastify.put(
    '/refund-requests/:requestId',
    { schema: reviewRequestSchema, preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { requestId } = request.params as { requestId: string };
        const { status, notes } = request.body as { status: 'APPROVED' | 'REJECTED'; notes?: string };
        const result = await reviewRefundRequest(requestId, request.user!.id, status, notes);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );
};