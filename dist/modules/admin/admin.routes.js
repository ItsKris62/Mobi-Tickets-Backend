"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rbac_1 = require("../../middleware/rbac");
const admin_service_1 = require("./admin.service");
const admin_schema_1 = require("./admin.schema");
exports.default = async (fastify) => {
    fastify.get('/dashboard', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (_request, reply) => {
        try {
            const stats = await (0, admin_service_1.getDashboardStats)();
            reply.send(stats);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.get('/users', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const query = request.query;
            const page = parseInt(query.page || '1', 10);
            const limit = parseInt(query.limit || '100', 10);
            const result = await (0, admin_service_1.getAllUsers)(page, limit, {
                search: query.search,
                role: query.role,
            });
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.post('/users/:userId/ban', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const { userId } = request.params;
            const body = request.body;
            const result = await (0, admin_service_1.banUser)(userId, request.user.id, body.reason);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
    fastify.delete('/users/:userId/ban', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const { userId } = request.params;
            const result = await (0, admin_service_1.unbanUser)(userId, request.user.id);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
    fastify.put('/users/:userId/ban', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const { userId } = request.params;
            const { banned, reason } = request.body;
            const result = banned
                ? await (0, admin_service_1.banUser)(userId, request.user.id, reason || 'Admin action')
                : await (0, admin_service_1.unbanUser)(userId, request.user.id);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
    fastify.put('/users/:userId/role', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const { userId } = request.params;
            const { role } = request.body;
            const result = await (0, admin_service_1.changeUserRole)(userId, role, request.user.id);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = (errorMessage).includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
    fastify.get('/events', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const query = request.query;
            const page = parseInt(query.page || '1', 10);
            const limit = parseInt(query.limit || '50', 10);
            const result = await (0, admin_service_1.getAllEvents)(page, limit);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.get('/logs', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const query = request.query;
            const page = parseInt(query.page || '1', 10);
            const limit = parseInt(query.limit || '100', 10);
            const result = await (0, admin_service_1.getAuditLogs)(page, limit, {
                type: query.type,
                search: query.search,
            });
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.get('/logs/export', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const query = request.query;
            const format = (query.format === 'json' ? 'json' : 'csv');
            const data = await (0, admin_service_1.exportAuditLogs)(format, {
                type: query.type,
                startDate: query.startDate,
                endDate: query.endDate,
            });
            if (format === 'json') {
                reply
                    .header('Content-Type', 'application/json')
                    .header('Content-Disposition', 'attachment; filename="logs.json"')
                    .send(data);
            }
            else {
                reply
                    .header('Content-Type', 'text/csv')
                    .header('Content-Disposition', 'attachment; filename="logs.csv"')
                    .send(data);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.post('/events/:eventId/cancel', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const { eventId } = request.params;
            const { reason } = request.body;
            const result = await (0, admin_service_1.adminCancelEvent)(eventId, reason, request.user.id);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = (errorMessage).includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
    fastify.get('/health', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (_request, reply) => {
        try {
            const health = await (0, admin_service_1.getSystemHealth)();
            reply.send(health);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.put('/events/:eventId/feature', { schema: admin_schema_1.featureEventSchema, preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const { eventId } = request.params;
            const { featured } = request.body;
            const result = await (0, admin_service_1.featureEvent)(eventId, featured, request.user.id);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
    fastify.get('/organizer-requests', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const query = request.query;
            const page = parseInt(query.page || '1', 10);
            const limit = parseInt(query.limit || '20', 10);
            const result = await (0, admin_service_1.getOrganizerRequests)(page, limit);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.put('/organizer-requests/:requestId', { schema: admin_schema_1.reviewRequestSchema, preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const { requestId } = request.params;
            const { status, notes } = request.body;
            const result = await (0, admin_service_1.reviewOrganizerRequest)(requestId, request.user.id, status, notes);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
    fastify.get('/refund-requests', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const query = request.query;
            const page = parseInt(query.page || '1', 10);
            const limit = parseInt(query.limit || '20', 10);
            const result = await (0, admin_service_1.getRefundRequests)(page, limit);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.put('/refund-requests/:requestId', { schema: admin_schema_1.reviewRequestSchema, preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const { requestId } = request.params;
            const { status, notes } = request.body;
            const result = await (0, admin_service_1.reviewRefundRequest)(requestId, request.user.id, status, notes);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
};
//# sourceMappingURL=admin.routes.js.map