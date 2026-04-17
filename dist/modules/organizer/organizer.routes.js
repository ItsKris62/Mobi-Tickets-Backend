"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rbac_1 = require("../../middleware/rbac");
const organizer_schema_1 = require("./organizer.schema");
const organizer_service_1 = require("./organizer.service");
exports.default = async (fastify) => {
    fastify.get('/analytics', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])] }, async (request, reply) => {
        try {
            const query = request.query;
            const period = query.period || '30d';
            const result = await (0, organizer_service_1.getOrganizerAnalytics)(request.user.id, period);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.get('/analytics/export', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])] }, async (request, reply) => {
        try {
            const query = request.query;
            const period = query.period || '30d';
            const csv = await (0, organizer_service_1.exportOrganizerAnalytics)(request.user.id, period);
            reply
                .header('Content-Type', 'text/csv')
                .header('Content-Disposition', 'attachment; filename="analytics.csv"')
                .send(csv);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.get('/balance', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])] }, async (request, reply) => {
        try {
            const result = await (0, organizer_service_1.getOrganizerBalance)(request.user.id);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.get('/payouts', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])] }, async (request, reply) => {
        try {
            const query = request.query;
            const page = parseInt(query.page || '1', 10);
            const limit = parseInt(query.limit || '20', 10);
            const result = await (0, organizer_service_1.getOrganizerPayouts)(request.user.id, page, limit);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.post('/payouts/request', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])] }, async (request, reply) => {
        try {
            const { amount, paymentMethod } = request.body;
            const result = await (0, organizer_service_1.requestPayout)(request.user.id, amount, paymentMethod);
            reply.status(201).send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
    fastify.post('/apply', { schema: organizer_schema_1.applySchema, preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const { businessName, description } = request.body;
            const result = await (0, organizer_service_1.applyForOrganizer)(request.user.id, businessName, description);
            reply.status(201).send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
};
//# sourceMappingURL=organizer.routes.js.map