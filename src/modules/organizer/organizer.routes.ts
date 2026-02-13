import { FastifyInstance } from 'fastify';
import { requireRole } from '../../middleware/rbac';
import { applySchema } from './organizer.schema';
import {
  getOrganizerAnalytics,
  getOrganizerPayouts,
  applyForOrganizer,
} from './organizer.service';

export default async (fastify: FastifyInstance) => {
  // Get organizer analytics
  fastify.get(
    '/analytics',
    { preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const query = request.query as { period?: string };
        const period = query.period || '30d';
        const result = await getOrganizerAnalytics(request.user!.id, period);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Get organizer payouts
  fastify.get(
    '/payouts',
    { preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])] },
    async (request, reply) => {
      try {
        const query = request.query as { page?: string; limit?: string };
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '20', 10);
        const result = await getOrganizerPayouts(request.user!.id, page, limit);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Apply for organizer role
  fastify.post(
    '/apply',
    { schema: applySchema, preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { businessName, description } = request.body as {
          businessName: string;
          description: string;
        };
        const result = await applyForOrganizer(request.user!.id, businessName, description);
        reply.status(201).send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(400).send({ error: errorMessage });
      }
    }
  );
};
