import { FastifyInstance } from 'fastify';
import {
  purchaseTicketSchema,
  refundRequestSchema,
  transferTicketSchema,
  validateTicketSchema,
} from './tickets.schema';
import {
  purchaseTickets,
  getUserTickets,
  getTicketQR,
  requestRefund,
  transferTicket,
  validateTicket,
} from './tickets.service';
import { requireRole } from '../../middleware/rbac';

export default async (fastify: FastifyInstance) => {
  // Purchase tickets (authenticated)
  fastify.post(
    '/purchase',
    { schema: purchaseTicketSchema, preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const body = request.body as { ticketId: string; quantity: number };
        const { ticketId, quantity } = body;
        const result = await purchaseTickets(request.user!.id, ticketId, quantity);
        reply.status(201).send({
          message: 'Purchase successful',
          orderId: result.order.id,
          qrCode: result.qrCode,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(400).send({ error: errorMessage });
      }
    }
  );

  // Get user's tickets (authenticated)
  fastify.get(
    '/my-tickets',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const tickets = await getUserTickets(request.user!.id);
        reply.send(tickets);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(400).send({ error: errorMessage });
      }
    }
  );

  // Get ticket QR code (authenticated)
  fastify.get(
    '/:orderId/qr',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { orderId } = request.params as { orderId: string };
        const result = await getTicketQR(orderId, request.user!.id);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Request refund (authenticated)
  fastify.post(
    '/refund',
    { schema: refundRequestSchema, preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { orderId, reason } = request.body as { orderId: string; reason: string };
        const result = await requestRefund(orderId, request.user!.id, reason);
        reply.status(201).send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Transfer ticket (authenticated)
  fastify.post(
    '/:id/transfer',
    { schema: transferTicketSchema, preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { recipientEmail } = request.body as { recipientEmail: string };
        const result = await transferTicket(id, request.user!.id, recipientEmail);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Validate ticket QR (organizer/admin)
  fastify.post(
    '/validate',
    {
      schema: validateTicketSchema,
      preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
    },
    async (request, reply) => {
      try {
        const { qrData } = request.body as { qrData: string };
        const result = await validateTicket(qrData);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(400).send({ error: errorMessage });
      }
    }
  );
};