"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyForOrganizer = exports.getOrganizerPayouts = exports.requestPayout = exports.exportOrganizerAnalytics = exports.getOrganizerBalance = exports.getOrganizerAnalytics = void 0;
const prisma_1 = require("../../lib/prisma");
const audit_1 = require("../../lib/audit");
const notification_service_1 = require("../notifications/notification.service");
const getOrganizerAnalytics = async (organizerId, period) => {
    const now = new Date();
    const periodMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365,
    };
    const days = periodMap[period] || 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const events = await prisma_1.prisma.event.findMany({
        where: { organizerId },
        select: { id: true, title: true },
    });
    const eventIds = events.map((e) => e.id);
    const [totalTicketsSold, totalRevenue, analyticsData, uniqueAttendees] = await Promise.all([
        prisma_1.prisma.ticketPurchase.count({
            where: {
                eventId: { in: eventIds },
                purchasedAt: { gte: startDate },
            },
        }),
        prisma_1.prisma.order.aggregate({
            where: {
                eventId: { in: eventIds },
                status: 'PAID',
                createdAt: { gte: startDate },
            },
            _sum: { totalAmount: true },
        }),
        prisma_1.prisma.eventAnalytics.findMany({
            where: {
                eventId: { in: eventIds },
                date: { gte: startDate },
            },
            orderBy: { date: 'asc' },
        }),
        prisma_1.prisma.ticketPurchase.groupBy({
            by: ['userId'],
            where: {
                eventId: { in: eventIds },
                purchasedAt: { gte: startDate },
            },
        }),
    ]);
    const revenueByEvent = await prisma_1.prisma.order.groupBy({
        by: ['eventId'],
        where: {
            eventId: { in: eventIds },
            status: 'PAID',
            createdAt: { gte: startDate },
        },
        _sum: { totalAmount: true },
        _count: true,
    });
    const revenueByEventWithNames = revenueByEvent.map((r) => {
        const event = events.find((e) => e.id === r.eventId);
        return {
            eventId: r.eventId,
            eventTitle: event?.title || 'Unknown',
            revenue: r._sum.totalAmount || 0,
            orders: r._count,
        };
    });
    const revenueByMonth = [];
    const monthMap = new Map();
    for (const entry of analyticsData) {
        const monthKey = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + Number(entry.revenue || 0));
    }
    for (const [month, revenue] of monthMap) {
        revenueByMonth.push({ month, revenue });
    }
    const ticketsByCategory = await prisma_1.prisma.ticketPurchase.groupBy({
        by: ['ticketId'],
        where: {
            eventId: { in: eventIds },
            purchasedAt: { gte: startDate },
        },
        _count: true,
    });
    const ticketIds = ticketsByCategory.map((t) => t.ticketId);
    const ticketDetails = await prisma_1.prisma.ticket.findMany({
        where: { id: { in: ticketIds } },
        select: { id: true, category: true },
    });
    const categoryCountMap = new Map();
    for (const tc of ticketsByCategory) {
        const detail = ticketDetails.find((td) => td.id === tc.ticketId);
        const cat = detail?.category || 'REGULAR';
        categoryCountMap.set(cat, (categoryCountMap.get(cat) || 0) + tc._count);
    }
    const ticketsByCategoryResult = Array.from(categoryCountMap.entries()).map(([category, count]) => ({
        category,
        count,
    }));
    return {
        period,
        totalEvents: events.length,
        totalTicketsSold,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        activeUsers: uniqueAttendees.length,
        revenueByEvent: revenueByEventWithNames,
        revenueByMonth,
        ticketsByCategory: ticketsByCategoryResult,
        dailyAnalytics: analyticsData,
    };
};
exports.getOrganizerAnalytics = getOrganizerAnalytics;
const getOrganizerBalance = async (organizerId) => {
    const events = await prisma_1.prisma.event.findMany({
        where: { organizerId },
        select: { id: true },
    });
    const eventIds = events.map((e) => e.id);
    const [totalEarnings, completedPayouts, pendingPayouts] = await Promise.all([
        prisma_1.prisma.order.aggregate({
            where: {
                eventId: { in: eventIds },
                status: 'PAID',
            },
            _sum: { totalAmount: true },
        }),
        prisma_1.prisma.payout.aggregate({
            where: {
                organizerId,
                status: 'COMPLETED',
            },
            _sum: { netAmount: true },
        }),
        prisma_1.prisma.payout.aggregate({
            where: {
                organizerId,
                status: { in: ['PENDING', 'PROCESSING'] },
            },
            _sum: { netAmount: true },
        }),
    ]);
    const totalRevenue = Number(totalEarnings._sum.totalAmount) || 0;
    const paidOut = Number(completedPayouts._sum.netAmount) || 0;
    const pending = Number(pendingPayouts._sum.netAmount) || 0;
    return {
        available: totalRevenue - paidOut - pending,
        pending,
        totalEarnings: totalRevenue,
    };
};
exports.getOrganizerBalance = getOrganizerBalance;
const exportOrganizerAnalytics = async (organizerId, period) => {
    const analytics = await (0, exports.getOrganizerAnalytics)(organizerId, period);
    const headers = ['Event', 'Revenue', 'Orders'];
    const rows = analytics.revenueByEvent.map((r) => [r.eventTitle, r.revenue, r.orders].join(','));
    const summary = [
        '',
        'Summary',
        `Total Events,${analytics.totalEvents}`,
        `Total Revenue,${analytics.totalRevenue}`,
        `Total Tickets Sold,${analytics.totalTicketsSold}`,
        `Active Users,${analytics.activeUsers}`,
        `Period,${analytics.period}`,
    ];
    return [headers.join(','), ...rows, ...summary].join('\n');
};
exports.exportOrganizerAnalytics = exportOrganizerAnalytics;
const requestPayout = async (organizerId, amount, paymentMethod) => {
    const balance = await (0, exports.getOrganizerBalance)(organizerId);
    if (amount > balance.available) {
        throw new Error(`Insufficient balance. Available: ${balance.available}, Requested: ${amount}`);
    }
    const payout = await prisma_1.prisma.payout.create({
        data: {
            organizerId,
            amount,
            fee: amount * 0.03,
            netAmount: amount * 0.97,
            status: 'PENDING',
            paymentMethod,
        },
    });
    await (0, notification_service_1.notifyAdmins)('SYSTEM', 'Payout Request', `Organizer ${organizerId} requested a payout of KES ${amount.toLocaleString()}.`, { payoutId: payout.id, organizerId, amount });
    await (0, audit_1.logAudit)('PAYOUT_REQUESTED', 'Payout', payout.id, organizerId, {
        amount,
        paymentMethod,
    });
    return {
        message: 'Payout request submitted successfully',
        payoutId: payout.id,
    };
};
exports.requestPayout = requestPayout;
const getOrganizerPayouts = async (organizerId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [payouts, total] = await Promise.all([
        prisma_1.prisma.payout.findMany({
            where: { organizerId },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                event: {
                    select: { id: true, title: true },
                },
            },
        }),
        prisma_1.prisma.payout.count({ where: { organizerId } }),
    ]);
    return {
        payouts,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
exports.getOrganizerPayouts = getOrganizerPayouts;
const applyForOrganizer = async (userId, businessName, description) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    if (!user) {
        throw new Error('User not found');
    }
    if (user.role === 'ORGANIZER') {
        throw new Error('You are already an organizer');
    }
    if (user.role === 'ADMIN') {
        throw new Error('Admin users cannot apply for organizer role');
    }
    const existing = await prisma_1.prisma.organizerApplication.findFirst({
        where: { userId, status: 'PENDING' },
    });
    if (existing) {
        throw new Error('You already have a pending organizer application');
    }
    const application = await prisma_1.prisma.organizerApplication.create({
        data: {
            userId,
            businessName,
            description,
        },
    });
    await (0, notification_service_1.notifyAdmins)('SYSTEM', 'New Organizer Application', `A new organizer application has been submitted by user ${userId}. Business: ${businessName}`, { applicationId: application.id, userId, businessName });
    await (0, audit_1.logAudit)('ORGANIZER_APPLICATION_SUBMITTED', 'OrganizerApplication', application.id, userId, {
        businessName,
    });
    return {
        message: 'Organizer application submitted successfully',
        applicationId: application.id,
    };
};
exports.applyForOrganizer = applyForOrganizer;
//# sourceMappingURL=organizer.service.js.map