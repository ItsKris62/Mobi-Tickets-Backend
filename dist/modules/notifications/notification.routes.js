"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const notification_service_1 = require("./notification.service");
const notificationResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    data: zod_1.z.any().optional(),
    isRead: zod_1.z.boolean(),
    readAt: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string(),
    event: zod_1.z
        .object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        posterUrl: zod_1.z.string().nullable(),
    })
        .nullable(),
});
exports.default = async (fastify) => {
    const server = fastify.withTypeProvider();
    server.get('/', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get notifications for the authenticated user',
            tags: ['notifications'],
            querystring: zod_1.z.object({
                unreadOnly: zod_1.z.string().optional().transform((val) => val === 'true'),
                limit: zod_1.z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
                offset: zod_1.z.string().optional().transform((val) => (val ? parseInt(val, 10) : 0)),
            }),
            response: {
                200: zod_1.z.object({
                    notifications: zod_1.z.array(notificationResponseSchema),
                    unreadCount: zod_1.z.number(),
                }),
            },
        },
    }, async (request, reply) => {
        const { unreadOnly, limit, offset } = request.query;
        const [notifications, unreadCount] = await Promise.all([
            (0, notification_service_1.getUserNotifications)(request.user.id, { unreadOnly, limit, offset }),
            (0, notification_service_1.getUnreadCount)(request.user.id),
        ]);
        return reply.send({
            notifications: notifications.map((n) => ({
                ...n,
                readAt: n.readAt?.toISOString() ?? null,
                createdAt: n.createdAt.toISOString(),
            })),
            unreadCount,
        });
    });
    server.get('/unread-count', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get unread notification count',
            tags: ['notifications'],
            response: {
                200: zod_1.z.object({
                    count: zod_1.z.number(),
                }),
            },
        },
    }, async (request, reply) => {
        const count = await (0, notification_service_1.getUnreadCount)(request.user.id);
        return reply.send({ count });
    });
    server.patch('/:id/read', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Mark a notification as read',
            tags: ['notifications'],
            params: zod_1.z.object({
                id: zod_1.z.string().uuid(),
            }),
            response: {
                200: zod_1.z.object({
                    success: zod_1.z.boolean(),
                }),
            },
        },
    }, async (request, reply) => {
        const { id } = request.params;
        await (0, notification_service_1.markAsRead)(id, request.user.id);
        return reply.send({ success: true });
    });
    server.patch('/read-all', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Mark all notifications as read',
            tags: ['notifications'],
            response: {
                200: zod_1.z.object({
                    success: zod_1.z.boolean(),
                    count: zod_1.z.number(),
                }),
            },
        },
    }, async (request, reply) => {
        const result = await (0, notification_service_1.markAllAsRead)(request.user.id);
        return reply.send({ success: true, count: result.count });
    });
    server.delete('/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Delete a notification',
            tags: ['notifications'],
            params: zod_1.z.object({
                id: zod_1.z.string().uuid(),
            }),
            response: {
                200: zod_1.z.object({
                    success: zod_1.z.boolean(),
                }),
            },
        },
    }, async (request, reply) => {
        const { id } = request.params;
        await (0, notification_service_1.deleteNotification)(id, request.user.id);
        return reply.send({ success: true });
    });
};
//# sourceMappingURL=notification.routes.js.map