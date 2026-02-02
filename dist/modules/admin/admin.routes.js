"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rbac_1 = require("../../middleware/rbac");
const admin_service_1 = require("./admin.service");
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
            const limit = parseInt(query.limit || '20', 10);
            const result = await (0, admin_service_1.getAllUsers)(page, limit);
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
    fastify.get('/events', { preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ADMIN'])] }, async (request, reply) => {
        try {
            const query = request.query;
            const page = parseInt(query.page || '1', 10);
            const limit = parseInt(query.limit || '20', 10);
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
            const limit = parseInt(query.limit || '50', 10);
            const result = await (0, admin_service_1.getAuditLogs)(page, limit);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
};
//# sourceMappingURL=admin.routes.js.map