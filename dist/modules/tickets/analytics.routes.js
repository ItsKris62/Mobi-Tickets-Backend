"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rbac_1 = require("../../middleware/rbac");
const analytics_service_1 = require("./analytics.service");
const analytics_schema_1 = require("./analytics.schema");
exports.default = async (fastify) => {
    const ORGANIZER_ONLY = {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
    };
    fastify.get('/organizer/summary', { ...ORGANIZER_ONLY, schema: analytics_schema_1.organizerSummarySchema }, async (request, reply) => {
        try {
            const { startDate, endDate } = request.query;
            const summary = await (0, analytics_service_1.getOrganizerSummary)(request.user.id, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
            reply.send(summary);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: `Failed to get organizer summary: ${errorMessage}` });
        }
    });
    fastify.get('/organizer/events', { ...ORGANIZER_ONLY, schema: analytics_schema_1.eventPerformanceSchema }, async (request, reply) => {
        try {
            const { status, sortBy, order } = request.query;
            const result = await (0, analytics_service_1.getEventPerformance)(request.user.id, {
                status,
                sortBy: sortBy ?? 'revenue',
                order: order ?? 'desc',
            });
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: `Failed to get event performance: ${errorMessage}` });
        }
    });
    fastify.get('/organizer/events/:eventId/detailed', { ...ORGANIZER_ONLY, schema: analytics_schema_1.eventDetailedAnalyticsSchema }, async (request, reply) => {
        try {
            const { eventId } = request.params;
            const detailedAnalytics = await (0, analytics_service_1.getDetailedEventAnalytics)(request.user.id, eventId);
            reply.send(detailedAnalytics);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('permission') || errorMessage.includes('not found') ? 403 : 500;
            reply.status(statusCode).send({ error: `Failed to get detailed analytics: ${errorMessage}` });
        }
    });
    fastify.get('/organizer/events/:eventId/export', { ...ORGANIZER_ONLY, schema: analytics_schema_1.exportAttendeesSchema }, async (request, reply) => {
        try {
            const { eventId } = request.params;
            const csvData = await (0, analytics_service_1.exportEventAttendeesCSV)(request.user.id, eventId);
            reply.header('Content-Type', 'text/csv');
            reply.header('Content-Disposition', `attachment; filename="attendees-${eventId}.csv"`);
            reply.send(csvData);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('permission') || errorMessage.includes('not found') ? 403 : 500;
            reply.status(statusCode).send({ error: `Failed to export attendees: ${errorMessage}` });
        }
    });
};
//# sourceMappingURL=analytics.routes.js.map