"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tickets_schema_1 = require("./tickets.schema");
const tickets_service_1 = require("./tickets.service");
const rbac_1 = require("../../middleware/rbac");
exports.default = async (fastify) => {
    fastify.post('/purchase', { schema: tickets_schema_1.purchaseTicketSchema, preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const body = request.body;
            const { ticketId, quantity } = body;
            const result = await (0, tickets_service_1.purchaseTickets)(request.user.id, ticketId, quantity);
            reply.status(201).send({
                message: 'Purchase successful',
                orderId: result.order.id,
                qrCode: result.qrCode,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
    fastify.get('/my-tickets', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const tickets = await (0, tickets_service_1.getUserTickets)(request.user.id);
            reply.send(tickets);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
    fastify.get('/:orderId/qr', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const { orderId } = request.params;
            const result = await (0, tickets_service_1.getTicketQR)(orderId, request.user.id);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
    fastify.post('/refund', { schema: tickets_schema_1.refundRequestSchema, preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const { orderId, reason } = request.body;
            const result = await (0, tickets_service_1.requestRefund)(orderId, request.user.id, reason);
            reply.status(201).send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
    fastify.post('/:id/transfer', { schema: tickets_schema_1.transferTicketSchema, preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { recipientEmail } = request.body;
            const result = await (0, tickets_service_1.transferTicket)(id, request.user.id, recipientEmail);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
    fastify.post('/validate', {
        schema: tickets_schema_1.validateTicketSchema,
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
    }, async (request, reply) => {
        try {
            const { qrData } = request.body;
            const result = await (0, tickets_service_1.validateTicket)(qrData);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
};
//# sourceMappingURL=tickets.routes.js.map