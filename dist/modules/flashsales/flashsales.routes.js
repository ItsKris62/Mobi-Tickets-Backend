"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const rbac_1 = require("../../middleware/rbac");
const flashsales_service_1 = require("./flashsales.service");
const ticketCategoryEnum = zod_1.z.enum(['REGULAR', 'VIP', 'VVIP']);
const flashSaleResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    eventId: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    discountPercent: zod_1.z.number(),
    discountAmount: zod_1.z.number().nullable(),
    startTime: zod_1.z.string(),
    endTime: zod_1.z.string(),
    isActive: zod_1.z.boolean(),
    maxRedemptions: zod_1.z.number().nullable(),
    currentRedemptions: zod_1.z.number(),
    promoCode: zod_1.z.string().nullable(),
    ticketCategories: zod_1.z.array(ticketCategoryEnum),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.default = async (fastify) => {
    const server = fastify.withTypeProvider();
    server.post('/', {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
        schema: {
            description: 'Create a new flash sale for an event',
            tags: ['flash-sales'],
            body: zod_1.z.object({
                eventId: zod_1.z.string().uuid(),
                name: zod_1.z.string().min(1, 'Name is required'),
                description: zod_1.z.string().optional(),
                discountPercent: zod_1.z.number().min(1).max(100),
                discountAmount: zod_1.z.number().optional(),
                startTime: zod_1.z.string().datetime(),
                endTime: zod_1.z.string().datetime(),
                maxRedemptions: zod_1.z.number().int().positive().optional(),
                promoCode: zod_1.z.string().min(4).max(20).optional(),
                ticketCategories: zod_1.z.array(ticketCategoryEnum).optional(),
            }),
            response: {
                201: flashSaleResponseSchema,
                400: zod_1.z.object({ error: zod_1.z.string() }),
                403: zod_1.z.object({ error: zod_1.z.string() }),
            },
        },
    }, async (request, reply) => {
        try {
            const flashSale = await (0, flashsales_service_1.createFlashSale)({
                ...request.body,
                startTime: new Date(request.body.startTime),
                endTime: new Date(request.body.endTime),
            }, request.user.id);
            return reply.status(201).send({
                ...flashSale,
                startTime: flashSale.startTime.toISOString(),
                endTime: flashSale.endTime.toISOString(),
                createdAt: flashSale.createdAt.toISOString(),
                updatedAt: flashSale.updatedAt.toISOString(),
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 : 400;
            return reply.status(statusCode).send({ error: errorMessage });
        }
    });
    server.get('/event/:eventId', {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
        schema: {
            description: 'Get all flash sales for an event',
            tags: ['flash-sales'],
            params: zod_1.z.object({
                eventId: zod_1.z.string().uuid(),
            }),
            response: {
                200: zod_1.z.array(flashSaleResponseSchema),
                403: zod_1.z.object({ error: zod_1.z.string() }),
                404: zod_1.z.object({ error: zod_1.z.string() }),
            },
        },
    }, async (request, reply) => {
        try {
            const { eventId } = request.params;
            const flashSales = await (0, flashsales_service_1.getEventFlashSales)(eventId, request.user.id, request.user.role);
            return reply.send(flashSales.map((fs) => ({
                ...fs,
                startTime: fs.startTime.toISOString(),
                endTime: fs.endTime.toISOString(),
                createdAt: fs.createdAt.toISOString(),
                updatedAt: fs.updatedAt.toISOString(),
            })));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            return reply.status(statusCode).send({ error: errorMessage });
        }
    });
    server.get('/event/:eventId/active', {
        schema: {
            description: 'Get active flash sales for an event (public)',
            tags: ['flash-sales'],
            params: zod_1.z.object({
                eventId: zod_1.z.string().uuid(),
            }),
            response: {
                200: zod_1.z.array(zod_1.z.object({
                    id: zod_1.z.string(),
                    name: zod_1.z.string(),
                    description: zod_1.z.string().nullable(),
                    discountPercent: zod_1.z.number(),
                    discountAmount: zod_1.z.number().nullable(),
                    startTime: zod_1.z.string(),
                    endTime: zod_1.z.string(),
                    ticketCategories: zod_1.z.array(ticketCategoryEnum),
                    promoCode: zod_1.z.string().nullable(),
                })),
            },
        },
    }, async (request, reply) => {
        const { eventId } = request.params;
        const flashSales = await (0, flashsales_service_1.getActiveFlashSales)(eventId);
        return reply.send(flashSales.map((fs) => ({
            ...fs,
            startTime: fs.startTime.toISOString(),
            endTime: fs.endTime.toISOString(),
        })));
    });
    server.patch('/:id', {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
        schema: {
            description: 'Update a flash sale',
            tags: ['flash-sales'],
            params: zod_1.z.object({
                id: zod_1.z.string().uuid(),
            }),
            body: zod_1.z.object({
                name: zod_1.z.string().optional(),
                description: zod_1.z.string().optional(),
                discountPercent: zod_1.z.number().min(1).max(100).optional(),
                discountAmount: zod_1.z.number().optional(),
                startTime: zod_1.z.string().datetime().optional(),
                endTime: zod_1.z.string().datetime().optional(),
                maxRedemptions: zod_1.z.number().int().positive().optional(),
                isActive: zod_1.z.boolean().optional(),
                ticketCategories: zod_1.z.array(ticketCategoryEnum).optional(),
            }),
            response: {
                200: flashSaleResponseSchema,
                400: zod_1.z.object({ error: zod_1.z.string() }),
                403: zod_1.z.object({ error: zod_1.z.string() }),
                404: zod_1.z.object({ error: zod_1.z.string() }),
            },
        },
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const updateData = {
                ...request.body,
                startTime: request.body.startTime ? new Date(request.body.startTime) : undefined,
                endTime: request.body.endTime ? new Date(request.body.endTime) : undefined,
            };
            const flashSale = await (0, flashsales_service_1.updateFlashSale)(id, updateData, request.user.id, request.user.role);
            return reply.send({
                ...flashSale,
                startTime: flashSale.startTime.toISOString(),
                endTime: flashSale.endTime.toISOString(),
                createdAt: flashSale.createdAt.toISOString(),
                updatedAt: flashSale.updatedAt.toISOString(),
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            return reply.status(statusCode).send({ error: errorMessage });
        }
    });
    server.delete('/:id', {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
        schema: {
            description: 'Delete a flash sale',
            tags: ['flash-sales'],
            params: zod_1.z.object({
                id: zod_1.z.string().uuid(),
            }),
            response: {
                200: zod_1.z.object({ message: zod_1.z.string() }),
                403: zod_1.z.object({ error: zod_1.z.string() }),
                404: zod_1.z.object({ error: zod_1.z.string() }),
            },
        },
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const result = await (0, flashsales_service_1.deleteFlashSale)(id, request.user.id, request.user.role);
            return reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            return reply.status(statusCode).send({ error: errorMessage });
        }
    });
    server.post('/validate-promo', {
        schema: {
            description: 'Validate a promo code for an event',
            tags: ['flash-sales'],
            body: zod_1.z.object({
                eventId: zod_1.z.string().uuid(),
                promoCode: zod_1.z.string(),
                ticketCategory: ticketCategoryEnum,
            }),
            response: {
                200: zod_1.z.object({
                    valid: zod_1.z.boolean(),
                    flashSaleId: zod_1.z.string(),
                    discountPercent: zod_1.z.number(),
                    discountAmount: zod_1.z.number().nullable(),
                    name: zod_1.z.string(),
                }),
                400: zod_1.z.object({ error: zod_1.z.string() }),
            },
        },
    }, async (request, reply) => {
        try {
            const { eventId, promoCode, ticketCategory } = request.body;
            const result = await (0, flashsales_service_1.validatePromoCode)(eventId, promoCode, ticketCategory);
            return reply.send({ valid: true, ...result });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Invalid promo code';
            return reply.status(400).send({ error: errorMessage });
        }
    });
    server.post('/:id/notify', {
        preHandler: [fastify.authenticate, (0, rbac_1.requireRole)(['ORGANIZER', 'ADMIN'])],
        schema: {
            description: 'Send notification about a flash sale to event attendees',
            tags: ['flash-sales'],
            params: zod_1.z.object({
                id: zod_1.z.string().uuid(),
            }),
            response: {
                200: zod_1.z.object({ notifiedCount: zod_1.z.number() }),
                403: zod_1.z.object({ error: zod_1.z.string() }),
                404: zod_1.z.object({ error: zod_1.z.string() }),
            },
        },
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const result = await (0, flashsales_service_1.triggerFlashSaleNotification)(id, request.user.id);
            return reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                errorMessage.includes('not found') ? 404 : 400;
            return reply.status(statusCode).send({ error: errorMessage });
        }
    });
};
//# sourceMappingURL=flashsales.routes.js.map