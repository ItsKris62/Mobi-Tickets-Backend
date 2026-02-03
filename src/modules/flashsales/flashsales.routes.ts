import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireRole } from '../../middleware/rbac';
import {
  createFlashSale,
  getEventFlashSales,
  getActiveFlashSales,
  updateFlashSale,
  deleteFlashSale,
  validatePromoCode,
  triggerFlashSaleNotification,
} from './flashsales.service';

const ticketCategoryEnum = z.enum(['REGULAR', 'VIP', 'VVIP']);

const flashSaleResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  discountPercent: z.number(),
  discountAmount: z.number().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  isActive: z.boolean(),
  maxRedemptions: z.number().nullable(),
  currentRedemptions: z.number(),
  promoCode: z.string().nullable(),
  ticketCategories: z.array(ticketCategoryEnum),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export default async (fastify: FastifyInstance) => {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Create flash sale
  server.post(
    '/',
    {
      preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
      schema: {
        description: 'Create a new flash sale for an event',
        tags: ['flash-sales'],
        body: z.object({
          eventId: z.string().uuid(),
          name: z.string().min(1, 'Name is required'),
          description: z.string().optional(),
          discountPercent: z.number().min(1).max(100),
          discountAmount: z.number().optional(),
          startTime: z.string().datetime(),
          endTime: z.string().datetime(),
          maxRedemptions: z.number().int().positive().optional(),
          promoCode: z.string().min(4).max(20).optional(),
          ticketCategories: z.array(ticketCategoryEnum).optional(),
        }),
        response: {
          201: flashSaleResponseSchema,
          400: z.object({ error: z.string() }),
          403: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const flashSale = await createFlashSale(
          {
            ...request.body,
            startTime: new Date(request.body.startTime),
            endTime: new Date(request.body.endTime),
          },
          request.user!.id
        );

        return reply.status(201).send({
          ...flashSale,
          startTime: flashSale.startTime.toISOString(),
          endTime: flashSale.endTime.toISOString(),
          createdAt: flashSale.createdAt.toISOString(),
          updatedAt: flashSale.updatedAt.toISOString(),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 : 400;
        return reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Get flash sales for an event (organizer view)
  server.get(
    '/event/:eventId',
    {
      preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
      schema: {
        description: 'Get all flash sales for an event',
        tags: ['flash-sales'],
        params: z.object({
          eventId: z.string().uuid(),
        }),
        response: {
          200: z.array(flashSaleResponseSchema),
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { eventId } = request.params;
        const flashSales = await getEventFlashSales(eventId, request.user!.id, request.user!.role);

        return reply.send(
          flashSales.map((fs) => ({
            ...fs,
            startTime: fs.startTime.toISOString(),
            endTime: fs.endTime.toISOString(),
            createdAt: fs.createdAt.toISOString(),
            updatedAt: fs.updatedAt.toISOString(),
          }))
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        return reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Get active flash sales for an event (public)
  server.get(
    '/event/:eventId/active',
    {
      schema: {
        description: 'Get active flash sales for an event (public)',
        tags: ['flash-sales'],
        params: z.object({
          eventId: z.string().uuid(),
        }),
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              description: z.string().nullable(),
              discountPercent: z.number(),
              discountAmount: z.number().nullable(),
              startTime: z.string(),
              endTime: z.string(),
              ticketCategories: z.array(ticketCategoryEnum),
              promoCode: z.string().nullable(),
            })
          ),
        },
      },
    },
    async (request, reply) => {
      const { eventId } = request.params;
      const flashSales = await getActiveFlashSales(eventId);

      return reply.send(
        flashSales.map((fs) => ({
          ...fs,
          startTime: fs.startTime.toISOString(),
          endTime: fs.endTime.toISOString(),
        }))
      );
    }
  );

  // Update flash sale
  server.patch(
    '/:id',
    {
      preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
      schema: {
        description: 'Update a flash sale',
        tags: ['flash-sales'],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          discountPercent: z.number().min(1).max(100).optional(),
          discountAmount: z.number().optional(),
          startTime: z.string().datetime().optional(),
          endTime: z.string().datetime().optional(),
          maxRedemptions: z.number().int().positive().optional(),
          isActive: z.boolean().optional(),
          ticketCategories: z.array(ticketCategoryEnum).optional(),
        }),
        response: {
          200: flashSaleResponseSchema,
          400: z.object({ error: z.string() }),
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const updateData = {
          ...request.body,
          startTime: request.body.startTime ? new Date(request.body.startTime) : undefined,
          endTime: request.body.endTime ? new Date(request.body.endTime) : undefined,
        };

        const flashSale = await updateFlashSale(id, updateData, request.user!.id, request.user!.role);

        return reply.send({
          ...flashSale,
          startTime: flashSale.startTime.toISOString(),
          endTime: flashSale.endTime.toISOString(),
          createdAt: flashSale.createdAt.toISOString(),
          updatedAt: flashSale.updatedAt.toISOString(),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        return reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Delete flash sale
  server.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
      schema: {
        description: 'Delete a flash sale',
        tags: ['flash-sales'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({ message: z.string() }),
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await deleteFlashSale(id, request.user!.id, request.user!.role);
        return reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        return reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Validate promo code
  server.post(
    '/validate-promo',
    {
      schema: {
        description: 'Validate a promo code for an event',
        tags: ['flash-sales'],
        body: z.object({
          eventId: z.string().uuid(),
          promoCode: z.string(),
          ticketCategory: ticketCategoryEnum,
        }),
        response: {
          200: z.object({
            valid: z.boolean(),
            flashSaleId: z.string(),
            discountPercent: z.number(),
            discountAmount: z.number().nullable(),
            name: z.string(),
          }),
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { eventId, promoCode, ticketCategory } = request.body;
        const result = await validatePromoCode(eventId, promoCode, ticketCategory);
        return reply.send({ valid: true, ...result });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Invalid promo code';
        return reply.status(400).send({ error: errorMessage });
      }
    }
  );

  // Trigger flash sale notification
  server.post(
    '/:id/notify',
    {
      preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
      schema: {
        description: 'Send notification about a flash sale to event attendees',
        tags: ['flash-sales'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({ notifiedCount: z.number() }),
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await triggerFlashSaleNotification(id, request.user!.id);
        return reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        return reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );
};
