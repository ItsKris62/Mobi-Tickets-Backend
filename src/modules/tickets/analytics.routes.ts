import { FastifyInstance } from 'fastify';
import { requireRole } from '../../middleware/rbac';
import {
  getOrganizerSummary,
  getEventPerformance,
  getDetailedEventAnalytics,
  exportEventAttendeesCSV,
} from './analytics.service';
import {
  organizerSummarySchema,
  eventPerformanceSchema,
  eventDetailedAnalyticsSchema,
  exportAttendeesSchema,
} from './analytics.schema';

export default async (fastify: FastifyInstance) => {
  const ORGANIZER_ONLY = {
    preHandler: [fastify.authenticate, requireRole(['ORGANIZER', 'ADMIN'])],
  };

  // GET /api/analytics/organizer/summary
  fastify.get(
    '/organizer/summary',
    { ...ORGANIZER_ONLY, schema: organizerSummarySchema },
    async (request, reply) => {
      try {
        const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
        const summary = await getOrganizerSummary(
          request.user!.id,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
        reply.send(summary);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: `Failed to get organizer summary: ${errorMessage}` });
      }
    }
  );

  // GET /api/analytics/organizer/events
  fastify.get(
    '/organizer/events',
    { ...ORGANIZER_ONLY, schema: eventPerformanceSchema },
    async (request, reply) => {
      try {
        const { status, sortBy, order } = request.query as {
          status?: string;
          sortBy?: 'revenue' | 'ticketsSold' | 'occupancyRate' | 'checkInRate';
          order?: 'asc' | 'desc';
        };
        const result = await getEventPerformance(request.user!.id, {
          status,
          sortBy: sortBy ?? 'revenue',
          order: order ?? 'desc',
        });
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: `Failed to get event performance: ${errorMessage}` });
      }
    }
  );

  // GET /api/analytics/organizer/events/:eventId/detailed
  fastify.get(
    '/organizer/events/:eventId/detailed',
    { ...ORGANIZER_ONLY, schema: eventDetailedAnalyticsSchema },
    async (request, reply) => {
      try {
        const { eventId } = request.params as { eventId: string };
        const detailedAnalytics = await getDetailedEventAnalytics(request.user!.id, eventId);
        reply.send(detailedAnalytics);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode =
          errorMessage.includes('permission') || errorMessage.includes('not found') ? 403 : 500;
        reply.status(statusCode).send({ error: `Failed to get detailed analytics: ${errorMessage}` });
      }
    }
  );

  // GET /api/analytics/organizer/events/:eventId/export
  fastify.get(
    '/organizer/events/:eventId/export',
    { ...ORGANIZER_ONLY, schema: exportAttendeesSchema },
    async (request, reply) => {
      try {
        const { eventId } = request.params as { eventId: string };
        const csvData = await exportEventAttendeesCSV(request.user!.id, eventId);
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="attendees-${eventId}.csv"`);
        reply.send(csvData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode =
          errorMessage.includes('permission') || errorMessage.includes('not found') ? 403 : 500;
        reply.status(statusCode).send({ error: `Failed to export attendees: ${errorMessage}` });
      }
    }
  );
};
