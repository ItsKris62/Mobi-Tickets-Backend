"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRefundRequest = exports.getRefundRequests = exports.reviewOrganizerRequest = exports.getOrganizerRequests = exports.featureEvent = exports.getSystemHealth = exports.adminCancelEvent = exports.exportAuditLogs = exports.getAuditLogs = exports.getAllEvents = exports.changeUserRole = exports.unbanUser = exports.banUser = exports.getAllUsers = exports.getDashboardStats = void 0;
const prisma_1 = require("../../lib/prisma");
const redis_1 = require("../../lib/redis");
const audit_1 = require("../../lib/audit");
const notification_service_1 = require("../notifications/notification.service");
const response_mappers_1 = require("../../lib/response-mappers");
const events_service_1 = require("../events/events.service");
const alerts_service_1 = require("../alerts/alerts.service");
const getDashboardStats = async () => {
    const [totalEvents, totalUsers, recentOrders, totalRevenue] = await Promise.all([
        prisma_1.prisma.event.count(),
        prisma_1.prisma.user.count(),
        prisma_1.prisma.order.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
        prisma_1.prisma.order.aggregate({
            where: { status: 'PAID' },
            _sum: { totalAmount: true },
        }),
    ]);
    return {
        totalEvents,
        totalUsers,
        recentOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
    };
};
exports.getDashboardStats = getDashboardStats;
const getAllUsers = async (page = 1, limit = 20, options) => {
    const skip = (page - 1) * limit;
    const where = {};
    if (options?.role && options.role !== 'all') {
        where.role = options.role.toUpperCase();
    }
    if (options?.search) {
        where.OR = [
            { fullName: { contains: options.search, mode: 'insensitive' } },
            { email: { contains: options.search, mode: 'insensitive' } },
        ];
    }
    const [users, total] = await Promise.all([
        prisma_1.prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                avatarUrl: true,
                phoneNumber: true,
                isBanned: true,
                isActive: true,
                dateOfBirth: true,
                idNumber: true,
                county: true,
                city: true,
                emergencyContact: true,
            },
        }),
        prisma_1.prisma.user.count({ where }),
    ]);
    return {
        users: users.map(response_mappers_1.mapUserToFrontend),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.getAllUsers = getAllUsers;
const banUser = async (userId, adminId, reason) => {
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            isBanned: true,
            bannedAt: new Date(),
            bannedReason: reason,
            isActive: false,
        },
    });
    await (0, audit_1.logAudit)('USER_BANNED', 'User', userId, adminId, { reason });
    await (0, alerts_service_1.createSystemAlert)('user', 'medium', 'User Banned', `User ${userId} was banned. Reason: ${reason}`, { userId, reason, bannedBy: adminId });
    return { message: 'User banned successfully', success: true };
};
exports.banUser = banUser;
const unbanUser = async (userId, adminId) => {
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            isBanned: false,
            bannedAt: null,
            bannedReason: null,
            isActive: true,
        },
    });
    await (0, audit_1.logAudit)('USER_UNBANNED', 'User', userId, adminId);
    return { message: 'User unbanned successfully', success: true };
};
exports.unbanUser = unbanUser;
const changeUserRole = async (userId, newRole, adminId) => {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user)
        throw new Error('User not found');
    const oldRole = user.role;
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
    });
    await (0, audit_1.logAudit)('USER_ROLE_CHANGED', 'User', userId, adminId, {
        oldRole,
        newRole,
    });
    return { message: `User role changed to ${newRole}`, success: true };
};
exports.changeUserRole = changeUserRole;
const getAllEvents = async (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
        prisma_1.prisma.event.findMany({
            where: { deletedAt: null },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                organizer: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                tickets: {
                    select: {
                        id: true,
                        category: true,
                        name: true,
                        price: true,
                        totalQuantity: true,
                        availableQuantity: true,
                    },
                },
            },
        }),
        prisma_1.prisma.event.count({ where: { deletedAt: null } }),
    ]);
    return {
        events: events.map(response_mappers_1.mapEventToFrontend),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.getAllEvents = getAllEvents;
const getAuditLogs = async (page = 1, limit = 50, options) => {
    const skip = (page - 1) * limit;
    const where = {};
    if (options?.type && options.type !== 'all') {
        const typeActionMap = {
            warning: ['BANNED', 'CANCELLED', 'REJECTED', 'SUSPENDED'],
            error: ['FAILED', 'ERROR', 'DENIED'],
            success: ['CREATED', 'APPROVED', 'PUBLISHED', 'COMPLETED', 'UNBANNED'],
            info: [],
        };
        const patterns = typeActionMap[options.type];
        if (patterns && patterns.length > 0) {
            where.OR = patterns.map((p) => ({ action: { contains: p } }));
        }
        else if (options.type === 'info') {
            const excludePatterns = [
                ...(typeActionMap.warning || []),
                ...(typeActionMap.error || []),
                ...(typeActionMap.success || []),
            ];
            where.AND = excludePatterns.map((p) => ({
                action: { not: { contains: p } },
            }));
        }
    }
    const [logs, total] = await Promise.all([
        prisma_1.prisma.auditLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                    },
                },
            },
        }),
        prisma_1.prisma.auditLog.count({ where }),
    ]);
    return {
        logs: logs.map(response_mappers_1.mapAuditLogToFrontend),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.getAuditLogs = getAuditLogs;
const exportAuditLogs = async (format = 'csv', options) => {
    const where = {};
    if (options?.startDate) {
        where.createdAt = { ...where.createdAt, gte: new Date(options.startDate) };
    }
    if (options?.endDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(options.endDate) };
    }
    const logs = await prisma_1.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10000,
        include: {
            user: {
                select: { id: true, email: true, fullName: true },
            },
        },
    });
    const mapped = logs.map(response_mappers_1.mapAuditLogToFrontend);
    if (format === 'json') {
        return JSON.stringify(mapped, null, 2);
    }
    const headers = ['ID', 'Timestamp', 'Type', 'Action', 'Entity', 'EntityID', 'User', 'IP', 'Status', 'Message'];
    const rows = mapped.map((l) => [l.id, l.timestamp, l.type, l.action, l.entity, l.entityId, l.user || '', l.ipAddress, l.status, `"${l.message.replace(/"/g, '""')}"`].join(','));
    return [headers.join(','), ...rows].join('\n');
};
exports.exportAuditLogs = exportAuditLogs;
const adminCancelEvent = async (eventId, reason, adminId) => {
    return (0, events_service_1.cancelEvent)(eventId, adminId, 'ADMIN', reason);
};
exports.adminCancelEvent = adminCancelEvent;
const getSystemHealth = async () => {
    let dbStatus = 'unknown';
    let redisStatus = 'unknown';
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        dbStatus = 'connected';
    }
    catch {
        dbStatus = 'disconnected';
    }
    try {
        const pong = await redis_1.redis.ping();
        redisStatus = pong === 'PONG' ? 'connected' : 'error';
    }
    catch {
        redisStatus = 'disconnected';
    }
    const memoryUsage = process.memoryUsage();
    return {
        status: dbStatus === 'connected' && redisStatus === 'connected' ? 'healthy' : 'degraded',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        services: {
            database: dbStatus,
            redis: redisStatus,
        },
        memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
        },
    };
};
exports.getSystemHealth = getSystemHealth;
const featureEvent = async (eventId, featured, adminId) => {
    const event = await prisma_1.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
        throw new Error('Event not found');
    }
    await prisma_1.prisma.event.update({
        where: { id: eventId },
        data: {
            isFeatured: featured,
            featuredAt: featured ? new Date() : null,
        },
    });
    await (0, audit_1.logAudit)(featured ? 'EVENT_FEATURED' : 'EVENT_UNFEATURED', 'Event', eventId, adminId);
    return { message: featured ? 'Event featured successfully' : 'Event unfeatured successfully' };
};
exports.featureEvent = featureEvent;
const getOrganizerRequests = async (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
        prisma_1.prisma.organizerApplication.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        avatarUrl: true,
                        createdAt: true,
                    },
                },
            },
        }),
        prisma_1.prisma.organizerApplication.count(),
    ]);
    return {
        requests: requests.map(response_mappers_1.mapOrganizerRequestToFrontend),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
exports.getOrganizerRequests = getOrganizerRequests;
const reviewOrganizerRequest = async (requestId, adminId, status, notes) => {
    const application = await prisma_1.prisma.organizerApplication.findUnique({
        where: { id: requestId },
        include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    if (!application) {
        throw new Error('Application not found');
    }
    if (application.status !== 'PENDING') {
        throw new Error('Application has already been reviewed');
    }
    await prisma_1.prisma.organizerApplication.update({
        where: { id: requestId },
        data: {
            status,
            reviewedBy: adminId,
            reviewedAt: new Date(),
            reviewNotes: notes,
        },
    });
    if (status === 'APPROVED') {
        await prisma_1.prisma.user.update({
            where: { id: application.userId },
            data: { role: 'ORGANIZER' },
        });
    }
    await (0, notification_service_1.createNotification)({
        userId: application.userId,
        type: 'SYSTEM',
        title: status === 'APPROVED'
            ? 'Organizer Application Approved!'
            : 'Organizer Application Update',
        message: status === 'APPROVED'
            ? 'Congratulations! Your organizer application has been approved. You can now create events.'
            : `Your organizer application has been reviewed. Status: ${status}.${notes ? ` Notes: ${notes}` : ''}`,
        data: { applicationId: requestId, status },
    });
    await (0, audit_1.logAudit)('ORGANIZER_APPLICATION_REVIEWED', 'OrganizerApplication', requestId, adminId, {
        status,
        notes,
        userId: application.userId,
    });
    return { message: `Application ${status.toLowerCase()} successfully` };
};
exports.reviewOrganizerRequest = reviewOrganizerRequest;
const getRefundRequests = async (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
        prisma_1.prisma.refundRequest.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { id: true, email: true, fullName: true },
                },
                order: {
                    select: {
                        id: true,
                        totalAmount: true,
                        status: true,
                        event: { select: { id: true, title: true } },
                    },
                },
            },
        }),
        prisma_1.prisma.refundRequest.count(),
    ]);
    return {
        requests: requests.map(response_mappers_1.mapRefundRequestToFrontend),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
exports.getRefundRequests = getRefundRequests;
const reviewRefundRequest = async (requestId, adminId, status, notes) => {
    const refundReq = await prisma_1.prisma.refundRequest.findUnique({
        where: { id: requestId },
        include: {
            order: { select: { id: true, totalAmount: true, eventId: true } },
            user: { select: { id: true, email: true } },
        },
    });
    if (!refundReq) {
        throw new Error('Refund request not found');
    }
    if (refundReq.status !== 'PENDING') {
        throw new Error('Refund request has already been reviewed');
    }
    await prisma_1.prisma.refundRequest.update({
        where: { id: requestId },
        data: {
            status,
            reviewedBy: adminId,
            reviewedAt: new Date(),
        },
    });
    if (status === 'APPROVED') {
        await prisma_1.prisma.order.update({
            where: { id: refundReq.orderId },
            data: { status: 'REFUNDED' },
        });
        await prisma_1.prisma.ticketPurchase.updateMany({
            where: { orderId: refundReq.orderId },
            data: { status: 'REFUNDED' },
        });
    }
    await (0, notification_service_1.createNotification)({
        userId: refundReq.userId,
        eventId: refundReq.order.eventId,
        type: 'REFUND_PROCESSED',
        title: status === 'APPROVED' ? 'Refund Approved' : 'Refund Request Update',
        message: status === 'APPROVED'
            ? `Your refund of KES ${refundReq.amount} has been approved and will be processed shortly.`
            : `Your refund request has been reviewed. Status: ${status}.${notes ? ` Notes: ${notes}` : ''}`,
        data: { refundRequestId: requestId, status, amount: refundReq.amount },
    });
    await (0, audit_1.logAudit)('REFUND_REQUEST_REVIEWED', 'RefundRequest', requestId, adminId, {
        status,
        notes,
        amount: refundReq.amount,
        orderId: refundReq.orderId,
    });
    return { message: `Refund request ${status.toLowerCase()} successfully` };
};
exports.reviewRefundRequest = reviewRefundRequest;
//# sourceMappingURL=admin.service.js.map