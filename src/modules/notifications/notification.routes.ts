import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from './notification.service';

const notificationResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  data: z.any().optional(),
  isRead: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
  event: z
    .object({
      id: z.string(),
      title: z.string(),
      posterUrl: z.string().nullable(),
    })
    .nullable(),
});

export default async (fastify: FastifyInstance) => {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Get user notifications
  server.get(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Get notifications for the authenticated user',
        tags: ['notifications'],
        querystring: z.object({
          unreadOnly: z.string().optional().transform((val) => val === 'true'),
          limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
          offset: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 0)),
        }),
        response: {
          200: z.object({
            notifications: z.array(notificationResponseSchema),
            unreadCount: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { unreadOnly, limit, offset } = request.query as {
        unreadOnly?: boolean;
        limit?: number;
        offset?: number;
      };

      const [notifications, unreadCount] = await Promise.all([
        getUserNotifications(request.user!.id, { unreadOnly, limit, offset }),
        getUnreadCount(request.user!.id),
      ]);

      return reply.send({
        notifications: notifications.map((n) => ({
          ...n,
          readAt: n.readAt?.toISOString() ?? null,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
      });
    }
  );

  // Get unread count only
  server.get(
    '/unread-count',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Get unread notification count',
        tags: ['notifications'],
        response: {
          200: z.object({
            count: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const count = await getUnreadCount(request.user!.id);
      return reply.send({ count });
    }
  );

  // Mark notification as read
  server.patch(
    '/:id/read',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Mark a notification as read',
        tags: ['notifications'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await markAsRead(id, request.user!.id);
      return reply.send({ success: true });
    }
  );

  // Mark all notifications as read
  server.patch(
    '/read-all',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Mark all notifications as read',
        tags: ['notifications'],
        response: {
          200: z.object({
            success: z.boolean(),
            count: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const result = await markAllAsRead(request.user!.id);
      return reply.send({ success: true, count: result.count });
    }
  );

  // Delete a notification
  server.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Delete a notification',
        tags: ['notifications'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await deleteNotification(id, request.user!.id);
      return reply.send({ success: true });
    }
  );
};
