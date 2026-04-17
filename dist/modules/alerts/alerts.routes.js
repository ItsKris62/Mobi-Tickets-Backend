"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rbac_1 = require("../../middleware/rbac");
const alerts_service_1 = require("./alerts.service");
exports.default = async (fastify) => {
    fastify.get('/', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const query = request.query;
            const result = await (0, alerts_service_1.listAlerts)({
                type: query.type,
                severity: query.severity,
                status: query.status,
                page: query.page ? parseInt(query.page, 10) : 1,
                limit: query.limit ? parseInt(query.limit, 10) : 20,
            });
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.post('/', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const { type, severity, title, message, source, metadata } = request.body;
            const alert = await (0, alerts_service_1.createAlert)({ type, severity, title, message, source, metadata });
            reply.status(201).send(alert);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
    fastify.put('/:alertId/acknowledge', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const { alertId } = request.params;
            const alert = await (0, alerts_service_1.acknowledgeAlert)(alertId, request.user.id);
            reply.send(alert);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
    fastify.put('/:alertId/resolve', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const { alertId } = request.params;
            const alert = await (0, alerts_service_1.resolveAlert)(alertId, request.user.id);
            reply.send(alert);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
};
//# sourceMappingURL=alerts.routes.js.map