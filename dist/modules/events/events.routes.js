"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const events_schema_1 = require("./events.schema");
const events_service_1 = require("./events.service");
const rbac_1 = require("../../middleware/rbac");
exports.default = async (fastify) => {
    const server = fastify.withTypeProvider();
    server.get('/', {
        schema: {
            description: 'List published events with pagination, search, and filtering',
            tags: ['events'],
            querystring: events_schema_1.getEventsQuerySchema,
        },
    }, async (request, reply) => {
        const result = await (0, events_service_1.getEvents)(request.query);
        return reply.send(result);
    });
    fastify.get('/featured', async (request, reply) => {
        try {
            const query = request.query;
            const limit = query.limit ? parseInt(query.limit, 10) : 10;
            const events = await (0, events_service_1.getFeaturedEvents)(limit);
            reply.send(events);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.post('/', {
        schema: events_schema_1.createEventSchema,
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
        attachValidation: true,
    }, async (request, reply) => {
        try {
            const data = request.body;
            const files = (request.files || {});
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
    fastify.get('/:id/attendees', {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const query = request.query;
            const page = parseInt(query.page || '1', 10);
            const limit = parseInt(query.limit || '20', 10);
            const result = await (0, events_service_1.getEventAttendees)(id, request.user.id, request.user.role, page, limit);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
    fastify.put('/:id', {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const data = request.body;
            const files = (request.files || {});
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
    server.post('/:id/postpone', {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
        schema: {
            description: 'Postpone an event and notify all attendees',
            tags: ['events'],
            params: zod_1.z.object({
                id: zod_1.z.string().uuid(),
            }),
            body: zod_1.z.object({
                newStartTime: zod_1.z.string().datetime(),
                newEndTime: zod_1.z.string().datetime().optional(),
                reason: zod_1.z.string().min(10, 'Please provide a detailed reason for postponement'),
            }),
            response: {
                200: zod_1.z.object({
                    event: zod_1.z.any(),
                    attendeesNotified: zod_1.z.number(),
                    message: zod_1.z.string(),
                }),
                400: zod_1.z.object({ error: zod_1.z.string() }),
                403: zod_1.z.object({ error: zod_1.z.string() }),
                404: zod_1.z.object({ error: zod_1.z.string() }),
            },
        },
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { newStartTime, newEndTime, reason } = request.body;
            const result = await (0, events_service_1.postponeEvent)(id, request.user.id, request.user.role, new Date(newStartTime), newEndTime ? new Date(newEndTime) : null, reason);
            return reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            return reply.status(statusCode).send({ error: errorMessage });
        }
    });
    server.post('/:id/cancel', {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
        schema: {
            description: 'Cancel an event and notify all attendees',
            tags: ['events'],
            params: zod_1.z.object({
                id: zod_1.z.string().uuid(),
            }),
            body: zod_1.z.object({
                reason: zod_1.z.string().min(10, 'Please provide a detailed reason for cancellation'),
            }),
            response: {
                200: zod_1.z.object({
                    event: zod_1.z.any(),
                    attendeesNotified: zod_1.z.number(),
                    message: zod_1.z.string(),
                }),
                400: zod_1.z.object({ error: zod_1.z.string() }),
                403: zod_1.z.object({ error: zod_1.z.string() }),
                404: zod_1.z.object({ error: zod_1.z.string() }),
            },
        },
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { reason } = request.body;
            const result = await (0, events_service_1.cancelEvent)(id, request.user.id, request.user.role, reason);
            return reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            return reply.status(statusCode).send({ error: errorMessage });
        }
    });
    server.post('/:id/publish', {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
        schema: {
            description: 'Publish an event (requires poster, description, and at least one ticket)',
            tags: ['events'],
            params: zod_1.z.object({
                id: zod_1.z.string().uuid(),
            }),
            response: {
                200: zod_1.z.any(),
                400: zod_1.z.object({ error: zod_1.z.string() }),
                403: zod_1.z.object({ error: zod_1.z.string() }),
                404: zod_1.z.object({ error: zod_1.z.string() }),
            },
        },
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const event = await (0, events_service_1.publishEvent)(id, request.user.id, request.user.role);
            return reply.send(event);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            return reply.status(statusCode).send({ error: errorMessage });
        }
    });
    server.get('/organizer/my-events', {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
        schema: {
            description: 'Get events created by the authenticated organizer',
            tags: ['events'],
            querystring: zod_1.z.object({
                status: zod_1.z.string().optional(),
                limit: zod_1.z.string().optional().transform((v) => (v ? parseInt(v, 10) : 50)),
                offset: zod_1.z.string().optional().transform((v) => (v ? parseInt(v, 10) : 0)),
            }),
            response: {
                200: zod_1.z.array(zod_1.z.any()),
            },
        },
    }, async (request, reply) => {
        const { status, limit, offset } = request.query;
        const events = await (0, events_service_1.getOrganizerEvents)(request.user.id, { status, limit, offset });
        return reply.send(events);
    });
};
//# sourceMappingURL=events.routes.js.map