"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const payments_schema_1 = require("./payments.schema");
const payments_service_1 = require("./payments.service");
exports.default = async (fastify) => {
    fastify.post('/initiate', { schema: payments_schema_1.initiatePaymentSchema, preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const { orderId, method, phoneNumber } = request.body;
            const result = await (0, payments_service_1.initiatePayment)(orderId, request.user.id, method, phoneNumber);
            reply.status(201).send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
    fastify.post('/callback/mpesa', async (request, reply) => {
        try {
            const body = request.body;
            const result = await (0, payments_service_1.handleMpesaCallback)(body.Body.stkCallback);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            fastify.log.error({ err: errorMessage }, 'M-Pesa callback error');
            reply.status(200).send({ message: 'Callback received' });
        }
    });
    fastify.post('/dummy-confirm/:transactionId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const { transactionId } = request.params;
            const result = await (0, payments_service_1.confirmDummyPayment)(transactionId, request.user.id);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
    fastify.get('/status/:transactionId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const { transactionId } = request.params;
            const result = await (0, payments_service_1.getPaymentStatus)(transactionId, request.user.id);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
};
//# sourceMappingURL=payments.routes.js.map