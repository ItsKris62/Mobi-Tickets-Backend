import { prisma } from '../../lib/prisma';
import { NotificationType } from '@prisma/client';
import { emailQueue } from '../../lib/queue';

// SSE sender function (injected from app.ts to avoid circular dependency)
let sseSender: ((userId: string, data: Record<string, unknown>) => void) | null = null;

export const setSSESender = (sender: (userId: string, data: Record<string, unknown>) => void) => {
  sseSender = sender;
};

// Helper to send real-time notification via SSE
const pushRealTimeNotification = (userId: string, notification: {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}) => {
  if (sseSender) {
    sseSender(userId, {
      eventType: 'notification',
      notification,
      timestamp: new Date().toISOString(),
    });
  }
};

interface CreateNotificationInput {
  userId: string;
  eventId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

interface BulkNotificationInput {
  userIds: string[];
  eventId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// Create a single notification
export const createNotification = async (input: CreateNotificationInput) => {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      eventId: input.eventId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data,
    },
  });

  // Push real-time notification via SSE
  pushRealTimeNotification(input.userId, {
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data,
  });

  return notification;
};

// Create notifications for multiple users (bulk)
export const createBulkNotifications = async (input: BulkNotificationInput) => {
  const notifications = input.userIds.map((userId) => ({
    userId,
    eventId: input.eventId,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data,
  }));

  const result = await prisma.notification.createMany({
    data: notifications,
  });

  // Push real-time notifications via SSE to all users
  input.userIds.forEach((userId) => {
    pushRealTimeNotification(userId, {
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data,
    });
  });

  return result;
};

// Get notifications for a user
export const getUserNotifications = async (
  userId: string,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }
) => {
  const { unreadOnly = false, limit = 50, offset = 0 } = options || {};

  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { isRead: false }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      event: {
        select: {
          id: true,
          title: true,
          posterUrl: true,
        },
      },
    },
  });
};

// Get unread notification count
export const getUnreadCount = async (userId: string) => {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
};

// Mark notification as read
export const markAsRead = async (notificationId: string, userId: string) => {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId, // Ensure user owns the notification
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

// Mark all notifications as read for a user
export const markAllAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

// Delete a notification
export const deleteNotification = async (notificationId: string, userId: string) => {
  return prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId,
    },
  });
};

// Notify all attendees of an event
export const notifyEventAttendees = async (
  eventId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>,
  sendEmail = true
) => {
  // Get all users who have purchased tickets for this event
  const orders = await prisma.order.findMany({
    where: {
      eventId,
      status: 'PAID',
    },
    select: {
      userId: true,
      user: {
        select: {
          email: true,
          fullName: true,
        },
      },
    },
    distinct: ['userId'],
  });

  const userIds = orders.map((order) => order.userId);

  // Create in-app notifications
  if (userIds.length > 0) {
    await createBulkNotifications({
      userIds,
      eventId,
      type,
      title,
      message,
      data,
    });

    // Queue email notifications
    if (sendEmail) {
      for (const order of orders) {
        await emailQueue.add('notification-email', {
          to: order.user.email,
          subject: title,
          body: message,
          userName: order.user.fullName || 'Valued Customer',
          data,
        });
      }
    }
  }

  return { notifiedCount: userIds.length };
};

// Notify admin users
export const notifyAdmins = async (
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  const adminIds = admins.map((admin) => admin.id);

  if (adminIds.length > 0) {
    await createBulkNotifications({
      userIds: adminIds,
      type,
      title,
      message,
      data,
    });
  }

  return { notifiedCount: adminIds.length };
};
