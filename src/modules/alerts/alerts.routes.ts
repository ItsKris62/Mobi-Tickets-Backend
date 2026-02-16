import { FastifyInstance } from 'fastify';
import { requireRole } from '../../middleware/rbac';
import {
  listAlerts,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
} from './alerts.service';

export default async (fastify: FastifyInstance) => {
  // List alerts with filtering
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const query = request.query as {
          type?: string;
          severity?: string;
          status?: string;
          page?: string;
          limit?: string;
        };
        const result = await listAlerts({
          type: query.type,
          severity: query.severity,
          status: query.status,
          page: query.page ? parseInt(query.page, 10) : 1,
          limit: query.limit ? parseInt(query.limit, 10) : 20,
        });
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Create a new alert
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { type, severity, title, message, source, metadata } = request.body as {
          type: string;
          severity: string;
          title: string;
          message: string;
          source?: string;
          metadata?: Record<string, any>;
        };
        const alert = await createAlert({ type, severity, title, message, source, metadata });
        reply.status(201).send(alert);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(400).send({ error: errorMessage });
      }
    }
  );

  // Acknowledge an alert
  fastify.put(
    '/:alertId/acknowledge',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { alertId } = request.params as { alertId: string };
        const alert = await acknowledgeAlert(alertId, request.user!.id);
        reply.send(alert);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(400).send({ error: errorMessage });
      }
    }
  );

  // Resolve an alert
  fastify.put(
    '/:alertId/resolve',
    { preHandler: [fastify.authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const { alertId } = request.params as { alertId: string };
        const alert = await resolveAlert(alertId, request.user!.id);
        reply.send(alert);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(400).send({ error: errorMessage });
      }
    }
  );
};
