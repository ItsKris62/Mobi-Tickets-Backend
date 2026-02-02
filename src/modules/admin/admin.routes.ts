import { FastifyInstance } from 'fastify';
import { requireRole } from '../../middleware/rbac';
import {
  getDashboardStats,
  getAllUsers,
  banUser,
  getAllEvents,
  getAuditLogs,
} from './admin.service';

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
};