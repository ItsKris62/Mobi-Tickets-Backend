import { FastifyInstance } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { createEventSchema, CreateEventInput } from './events.schema';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent
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
};