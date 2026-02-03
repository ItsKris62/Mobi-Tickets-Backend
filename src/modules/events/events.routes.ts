import { FastifyInstance } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { createEventSchema, CreateEventInput } from './events.schema';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  postponeEvent,
  cancelEvent,
  publishEvent,
  getOrganizerEvents
} from './events.service';
import { requireRole } from '../../middleware/rbac';

// Type for parsed multipart files object
interface ParsedFiles {
  poster?: MultipartFile;
  trailer?: MultipartFile;
}

export default async (fastify: FastifyInstance) => {
  // Public: List events
  fastify.get('/', async (_request, reply) => {
    const events = await getEvents({ upcoming: true });
    reply.send(events);
  });

  // Organizer/Admin only: Create event with multipart upload
  fastify.post(
    '/',
    {
      schema: createEventSchema,
      preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
      attachValidation: true,
    },
    async (request, reply) => {
      try {
        const data = request.body as CreateEventInput;
        const files = (request.files || {}) as ParsedFiles;
        const poster = files.poster;
        const trailer = files.trailer;

        const event = await createEvent(data, request.user!.id, poster, trailer);
        reply.status(201).send(event);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(400).send({ error: errorMessage });
      }
    }
  );

  // Public: Get event by ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const event = await getEventById(id);
      reply.send(event);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.status(404).send({ error: errorMessage });
    }
  });

  // Organizer/Admin only: Update event
  fastify.put(
    '/:id',
    {
      preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = request.body as Partial<CreateEventInput>;
        const files = (request.files || {}) as ParsedFiles;
        const poster = files.poster;
        const trailer = files.trailer;

        const event = await updateEvent(
          id,
          request.user!.id,
          request.user!.role,
          data,
          poster,
          trailer
        );
        reply.send(event);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Organizer/Admin only: Delete event
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await deleteEvent(id, request.user!.id, request.user!.role);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Organizer/Admin only: Postpone event
  server.post(
    '/:id/postpone',
    {
      preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
      schema: {
        description: 'Postpone an event and notify all attendees',
        tags: ['events'],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          newStartTime: z.string().datetime(),
          newEndTime: z.string().datetime().optional(),
          reason: z.string().min(10, 'Please provide a detailed reason for postponement'),
        }),
        response: {
          200: z.object({
            event: z.any(),
            attendeesNotified: z.number(),
            message: z.string(),
          }),
          400: z.object({ error: z.string() }),
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { newStartTime, newEndTime, reason } = request.body;

        const result = await postponeEvent(
          id,
          request.user!.id,
          request.user!.role,
          new Date(newStartTime),
          newEndTime ? new Date(newEndTime) : null,
          reason
        );

        return reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        return reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Organizer/Admin only: Cancel event
  server.post(
    '/:id/cancel',
    {
      preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
      schema: {
        description: 'Cancel an event and notify all attendees',
        tags: ['events'],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          reason: z.string().min(10, 'Please provide a detailed reason for cancellation'),
        }),
        response: {
          200: z.object({
            event: z.any(),
            attendeesNotified: z.number(),
            message: z.string(),
          }),
          400: z.object({ error: z.string() }),
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { reason } = request.body;

        const result = await cancelEvent(
          id,
          request.user!.id,
          request.user!.role,
          reason
        );

        return reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        return reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Organizer/Admin only: Publish event
  server.post(
    '/:id/publish',
    {
      preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
      schema: {
        description: 'Publish an event (requires poster, description, and at least one ticket)',
        tags: ['events'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.any(),
          400: z.object({ error: z.string() }),
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const event = await publishEvent(id, request.user!.id, request.user!.role);
        return reply.send(event);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        return reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Organizer only: Get my events
  server.get(
    '/organizer/my-events',
    {
      preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
      schema: {
        description: 'Get events created by the authenticated organizer',
        tags: ['events'],
        querystring: z.object({
          status: z.string().optional(),
          limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 50)),
          offset: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 0)),
        }),
        response: {
          200: z.array(z.any()),
        },
      },
    },
    async (request, reply) => {
      const { status, limit, offset } = request.query;
      const events = await getOrganizerEvents(request.user!.id, { status, limit, offset });
      return reply.send(events);
    }
  );
};