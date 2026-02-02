"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.getAllEvents = exports.banUser = exports.getAllUsers = exports.getDashboardStats = void 0;
const prisma_1 = require("../../lib/prisma");
const audit_1 = require("../../lib/audit");
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
const getAllUsers = async (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
        prisma_1.prisma.user.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                createdAt: true,
                avatarUrl: true,
            },
        }),
        prisma_1.prisma.user.count(),
    ]);
    return {
        users,
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
    await (0, audit_1.logAudit)('USER_BANNED', 'User', userId, adminId, { reason });
    return { message: 'User banned successfully' };
};
exports.banUser = banUser;
const getAllEvents = async (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
        prisma_1.prisma.event.findMany({
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
            },
        }),
        prisma_1.prisma.event.count(),
    ]);
    return {
        events,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.getAllEvents = getAllEvents;
const getAuditLogs = async (page = 1, limit = 50) => {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
        prisma_1.prisma.auditLog.findMany({
            skip,
            take: limit,
            orderBy: { timestamp: 'desc' },
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
        prisma_1.prisma.auditLog.count(),
    ]);
    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.getAuditLogs = getAuditLogs;
//# sourceMappingURL=admin.service.js.map