"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_schema_1 = require("./events.schema");
const events_service_1 = require("./events.service");
const rbac_1 = require("../../middleware/rbac");
exports.default = async (fastify) => {
    fastify.get('/', async (request, reply) => {
        const events = await (0, events_service_1.getEvents)({ upcoming: true });
        reply.send(events);
    });
    fastify.post('/', {
        schema: events_schema_1.createEventSchema,
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
        attachValidation: true,
    }, async (request, reply) => {
        try {
            const data = request.body;
            const files = request.files || {};
            const poster = files.poster;
            const trailer = files.trailer;
            const event = await (0, events_service_1.createEvent)(data, request.user.id, poster, trailer);
            reply.status(201).send(event);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
    fastify.get('/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const event = await (0, events_service_1.getEventById)(id);
            reply.send(event);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(404).send({ error: errorMessage });
        }
    });
    fastify.put('/:id', {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const data = request.body;
            const files = request.files || {};
            const poster = files.poster;
            const trailer = files.trailer;
            const event = await (0, events_service_1.updateEvent)(id, request.user.id, request.user.role, data, poster, trailer);
            reply.send(event);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
    fastify.delete('/:id', {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const result = await (0, events_service_1.deleteEvent)(id, request.user.id, request.user.role);
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
//# sourceMappingURL=events.routes.js.map