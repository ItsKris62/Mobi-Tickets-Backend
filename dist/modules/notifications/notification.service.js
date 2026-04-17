"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyAdmins = exports.notifyEventAttendees = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getUnreadCount = exports.getUserNotifications = exports.createBulkNotifications = exports.createNotification = exports.setSSESender = void 0;
const prisma_1 = require("../../lib/prisma");
const client_1 = require("@prisma/client");
const queue_1 = require("../../lib/queue");
let sseSender = null;
const setSSESender = (sender) => {
    sseSender = sender;
};
exports.setSSESender = setSSESender;
const pushRealTimeNotification = (userId, notification) => {
    if (sseSender) {
        sseSender(userId, {
            eventType: 'notification',
            notification,
            timestamp: new Date().toISOString(),
        });
    }
};
const createNotification = async (input) => {
    const notification = await prisma_1.prisma.notification.create({
        data: {
            userId: input.userId,
            eventId: input.eventId,
            type: input.type,
            title: input.title,
            message: input.message,
            data: (input.data ?? client_1.Prisma.DbNull),
        },
    });
    pushRealTimeNotification(input.userId, {
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data,
    });
    return notification;
};
exports.createNotification = createNotification;
const createBulkNotifications = async (input) => {
    const notifications = input.userIds.map((userId) => ({
        userId,
        eventId: input.eventId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: (input.data ?? client_1.Prisma.DbNull),
    }));
    const result = await prisma_1.prisma.notification.createMany({
        data: notifications,
    });
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
exports.createBulkNotifications = createBulkNotifications;
const getUserNotifications = async (userId, options) => {
    const { unreadOnly = false, limit = 50, offset = 0 } = options || {};
    return prisma_1.prisma.notification.findMany({
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
exports.getUserNotifications = getUserNotifications;
const getUnreadCount = async (userId) => {
    return prisma_1.prisma.notification.count({
        where: {
            userId,
            isRead: false,
        },
    });
};
exports.getUnreadCount = getUnreadCount;
const markAsRead = async (notificationId, userId) => {
    return prisma_1.prisma.notification.updateMany({
        where: {
            id: notificationId,
            userId,
        },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    });
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (userId) => {
    return prisma_1.prisma.notification.updateMany({
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
exports.markAllAsRead = markAllAsRead;
const deleteNotification = async (notificationId, userId) => {
    return prisma_1.prisma.notification.deleteMany({
        where: {
            id: notificationId,
            userId,
        },
    });
};
exports.deleteNotification = deleteNotification;
const notifyEventAttendees = async (eventId, type, title, message, data, sendEmail = true) => {
    const orders = await prisma_1.prisma.order.findMany({
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
    if (userIds.length > 0) {
        await (0, exports.createBulkNotifications)({
            userIds,
            eventId,
            type,
            title,
            message,
            data,
        });
        if (sendEmail) {
            for (const order of orders) {
                try {
                    await (0, queue_1.sendEmail)({
                        to: order.user.email,
                        subject: title,
                        text: message,
                    });
                }
                catch {
                }
            }
        }
    }
    return { notifiedCount: userIds.length };
};
exports.notifyEventAttendees = notifyEventAttendees;
const notifyAdmins = async (type, title, message, data) => {
    const admins = await prisma_1.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
    });
    const adminIds = admins.map((admin) => admin.id);
    if (adminIds.length > 0) {
        await (0, exports.createBulkNotifications)({
            userIds: adminIds,
            type,
            title,
            message,
            data,
        });
    }
    return { notifiedCount: adminIds.length };
};
exports.notifyAdmins = notifyAdmins;
//# sourceMappingURL=notification.service.js.map