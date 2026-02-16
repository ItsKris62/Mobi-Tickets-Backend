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
  changeUserRole,
  exportAuditLogs,
  adminCancelEvent,
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

  // Get all users with pagination, search, and role filtering
  fastify.get(
    '/users',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const query = request.query as {
          page?: string;
          limit?: string;
          search?: string;
          role?: string;
        };
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '100', 10);
        const result = await getAllUsers(page, limit, {
          search: query.search,
          role: query.role,
        });
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Ban user (legacy POST endpoint)
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

  // Unban user (legacy DELETE endpoint)
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

  // Toggle ban/unban (PUT endpoint - what the frontend uses)
  fastify.put(
    '/users/:userId/ban',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const { banned, reason } = request.body as { banned: boolean; reason?: string };

        const result = banned
          ? await banUser(userId, request.user!.id, reason || 'Admin action')
          : await unbanUser(userId, request.user!.id);

        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(400).send({ error: errorMessage });
      }
    }
  );

  // Change user role
  fastify.put(
    '/users/:userId/role',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const { role } = request.body as { role: 'ATTENDEE' | 'ORGANIZER' | 'ADMIN' };
        const result = await changeUserRole(userId, role, request.user!.id);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = (errorMessage).includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
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
        const limit = parseInt(query.limit || '50', 10);
        const result = await getAllEvents(page, limit);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Get audit logs with optional filtering
  fastify.get(
    '/logs',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const query = request.query as {
          page?: string;
          limit?: string;
          type?: string;
          search?: string;
        };
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '100', 10);
        const result = await getAuditLogs(page, limit, {
          type: query.type,
          search: query.search,
        });
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Export audit logs as CSV or JSON
  fastify.get(
    '/logs/export',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const query = request.query as {
          format?: string;
          startDate?: string;
          endDate?: string;
          type?: string;
        };
        const format = (query.format === 'json' ? 'json' : 'csv') as 'csv' | 'json';
        const data = await exportAuditLogs(format, {
          type: query.type,
          startDate: query.startDate,
          endDate: query.endDate,
        });

        if (format === 'json') {
          reply
            .header('Content-Type', 'application/json')
            .header('Content-Disposition', 'attachment; filename="logs.json"')
            .send(data);
        } else {
          reply
            .header('Content-Type', 'text/csv')
            .header('Content-Disposition', 'attachment; filename="logs.csv"')
            .send(data);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Admin cancel event
  fastify.post(
    '/events/:eventId/cancel',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { eventId } = request.params as { eventId: string };
        const { reason } = request.body as { reason: string };
        const result = await adminCancelEvent(eventId, reason, request.user!.id);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = (errorMessage).includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
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
