"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportEventAttendeesCSV = exports.getDetailedEventAnalytics = exports.getEventPerformance = exports.getRevenueTimeSeries = exports.getOrganizerSummary = void 0;
exports.invalidateOrganizerAnalyticsCache = invalidateOrganizerAnalyticsCache;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const redis_1 = require("../../lib/redis");
function calculatePercentage(current, previous) {
    if (previous === 0)
        return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
}
function getTrendDirection(change) {
    if (change > 0.1)
        return 'up';
    if (change < -0.1)
        return 'down';
    return 'flat';
}
async function invalidateOrganizerAnalyticsCache(organizerId) {
    try {
        let cursor = 0;
        const matchPattern = `analytics:org:${organizerId}:*`;
        do {
            const result = await redis_1.redis.scan(cursor, { match: matchPattern, count: 100 });
            cursor = Number(result[0]);
            const keys = result[1];
            if (keys.length > 0) {
                await Promise.all(keys.map((k) => redis_1.redis.del(k)));
            }
        } while (cursor !== 0);
    }
    catch (err) {
        console.warn(`[invalidateOrganizerAnalyticsCache] Failed for organizer ${organizerId}:`, err);
    }
}
const getOrganizerSummary = async (organizerId, startDate, endDate) => {
    const period = {
        end: endDate || new Date(),
        start: startDate || new Date(new Date().setDate(new Date().getDate() - 30)),
    };
    const periodDuration = period.end.getTime() - period.start.getTime();
    const previousPeriod = {
        start: new Date(period.start.getTime() - periodDuration),
        end: period.start,
    };
    const organizerEvents = await prisma_1.prisma.event.findMany({
        where: { organizerId },
        select: { id: true, status: true },
    });
    const organizerEventIds = organizerEvents.map(e => e.id);
    if (organizerEventIds.length === 0) {
        return { totalEvents: 0, totalTicketsSold: 0, totalRevenue: 0, totalCapacity: 0, overallOccupancyRate: 0, totalCheckIns: 0, checkInRate: 0, eventsByStatus: {}, revenueTrend: { current: 0, previous: 0, changePercent: 0, direction: 'flat' }, ticketsTrend: { current: 0, previous: 0, changePercent: 0, direction: 'flat' } };
    }
    const analyticsWhere = { eventId: { in: organizerEventIds } };
    const [totalTicketsSold, totalRevenue, totalCapacity, totalCheckIns,] = await Promise.all([
        prisma_1.prisma.eventAnalytics.aggregate({ where: analyticsWhere, _sum: { totalTicketsSold: true } }),
        prisma_1.prisma.eventAnalytics.aggregate({ where: analyticsWhere, _sum: { totalRevenue: true } }),
        prisma_1.prisma.eventAnalytics.aggregate({ where: analyticsWhere, _sum: { totalCapacity: true } }),
        prisma_1.prisma.eventAnalytics.aggregate({ where: analyticsWhere, _sum: { totalCheckIns: true } }),
    ]);
    const revenueTrendCurrent = await prisma_1.prisma.$queryRaw `
    SELECT SUM(t.price) as total FROM "ticket_purchases" tp
    JOIN "tickets" t ON tp."ticketId" = t.id
    WHERE tp."eventId" = ANY(ARRAY[${client_1.Prisma.join(organizerEventIds)}])
    AND tp."purchasedAt" >= ${period.start} AND tp."purchasedAt" < ${period.end}
  `;
    const revenueTrendPrevious = await prisma_1.prisma.$queryRaw `
    SELECT SUM(t.price) as total FROM "ticket_purchases" tp
    JOIN "tickets" t ON tp."ticketId" = t.id
    WHERE tp."eventId" = ANY(ARRAY[${client_1.Prisma.join(organizerEventIds)}])
    AND tp."purchasedAt" >= ${previousPeriod.start} AND tp."purchasedAt" < ${previousPeriod.end}
  `;
    const ticketsTrendCurrent = await prisma_1.prisma.ticketPurchase.count({
        where: { eventId: { in: organizerEventIds }, purchasedAt: { gte: period.start, lt: period.end } },
    });
    const ticketsTrendPrevious = await prisma_1.prisma.ticketPurchase.count({
        where: { eventId: { in: organizerEventIds }, purchasedAt: { gte: previousPeriod.start, lt: previousPeriod.end } },
    });
    const eventsByStatus = organizerEvents.reduce((acc, event) => {
        acc[event.status] = (acc[event.status] || 0) + 1;
        return acc;
    }, {});
    const sold = totalTicketsSold._sum.totalTicketsSold || 0;
    const capacity = totalCapacity._sum.totalCapacity || 0;
    const checkIns = totalCheckIns._sum.totalCheckIns || 0;
    const revenueCurrent = Number(revenueTrendCurrent[0]?.total || 0);
    const revenuePrevious = Number(revenueTrendPrevious[0]?.total || 0);
    const revenueChange = calculatePercentage(revenueCurrent, revenuePrevious);
    const ticketsCurrent = ticketsTrendCurrent || 0;
    const ticketsPrevious = ticketsTrendPrevious || 0;
    const ticketsChange = calculatePercentage(ticketsCurrent, ticketsPrevious);
    return {
        totalEvents: organizerEventIds.length,
        totalTicketsSold: sold,
        totalRevenue: totalRevenue._sum.totalRevenue || 0,
        totalCapacity: capacity,
        overallOccupancyRate: capacity > 0 ? (sold / capacity) * 100 : 0,
        totalCheckIns: checkIns,
        checkInRate: sold > 0 ? (checkIns / sold) * 100 : 0,
        eventsByStatus: {
            DRAFT: eventsByStatus.DRAFT || 0,
            PUBLISHED: eventsByStatus.PUBLISHED || 0,
            COMPLETED: eventsByStatus.COMPLETED || 0,
            CANCELLED: eventsByStatus.CANCELLED || 0,
            POSTPONED: eventsByStatus.POSTPONED || 0,
        },
        revenueTrend: {
            current: revenueCurrent,
            previous: revenuePrevious,
            changePercent: revenueChange,
            direction: getTrendDirection(revenueChange),
        },
        ticketsTrend: {
            current: ticketsCurrent,
            previous: ticketsPrevious,
            changePercent: ticketsChange,
            direction: getTrendDirection(ticketsChange),
        },
    };
};
exports.getOrganizerSummary = getOrganizerSummary;
const getRevenueTimeSeries = async (organizerId) => {
    return { data: [], totalRevenue: 0, interval: 'daily' };
};
exports.getRevenueTimeSeries = getRevenueTimeSeries;
const getEventPerformance = async (organizerId, options) => {
    const { status, sortBy = 'revenue', order = 'desc' } = options;
    const cacheKey = `analytics:org:${organizerId}:events:${JSON.stringify(options)}`;
    try {
        const cached = await redis_1.redis.get(cacheKey);
        if (cached)
            return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
    catch (err) {
        console.warn(`[Redis GET] Failed for ${cacheKey}:`, err);
    }
    const events = await prisma_1.prisma.event.findMany({
        where: {
            organizerId,
            ...(status && { status: status.toUpperCase() }),
        },
        include: {
            analytics: true,
        },
        orderBy: {
            startTime: 'desc',
        }
    });
    const performanceData = events.map(event => {
        const analytics = event.analytics[0];
        const sold = analytics?.totalTicketsSold || 0;
        const capacity = analytics?.totalCapacity || event.maxCapacity || 0;
        const checkIns = analytics?.totalCheckIns || 0;
        const revenue = analytics?.totalRevenue || 0;
        const occupancyRate = capacity > 0 ? (sold / capacity) * 100 : 0;
        const checkInRate = sold > 0 ? (checkIns / sold) * 100 : 0;
        const ticketsByType = (analytics?.ticketsByType || []).map(t => ({
            ...t,
            occupancyRate: t.capacity > 0 ? (t.sold / t.capacity) * 100 : 0,
        }));
        const now = new Date();
        const eventDate = new Date(event.startTime);
        const publishDate = event.publishedAt ? new Date(event.publishedAt) : new Date(event.createdAt);
        const daysSincePublish = Math.max(1, (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
        const salesVelocity = sold / daysSincePublish;
        const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        const avgTicketPrice = sold > 0 ? revenue / sold : 0;
        const projectedRevenue = daysUntilEvent > 0 ? revenue + (salesVelocity * daysUntilEvent * avgTicketPrice) : revenue;
        return {
            eventId: event.id,
            title: event.title,
            date: event.startTime.toISOString(),
            status: event.status,
            county: event.county || '',
            venue: event.location?.venue || '',
            metrics: {
                ticketsSold: sold,
                totalCapacity: capacity,
                occupancyRate,
                revenue,
                checkIns,
                checkInRate,
                ticketsByType,
                salesVelocity,
                daysUntilEvent: Math.round(daysUntilEvent),
                projectedRevenue: isNaN(projectedRevenue) ? revenue : projectedRevenue,
            }
        };
    });
    performanceData.sort((a, b) => {
        const valA = a.metrics[sortBy] || 0;
        const valB = b.metrics[sortBy] || 0;
        return order === 'asc' ? valA - valB : valB - valA;
    });
    const result = { events: performanceData };
    try {
        await redis_1.redis.set(cacheKey, JSON.stringify(result), { ex: 300 });
    }
    catch (err) {
        console.warn(`[Redis SET] Failed for ${cacheKey}:`, err);
    }
    return result;
};
exports.getEventPerformance = getEventPerformance;
const getDetailedEventAnalytics = async (organizerId, eventId) => {
    const cacheKey = `analytics:org:${organizerId}:event:${eventId}:detailed`;
    try {
        const cached = await redis_1.redis.get(cacheKey);
        if (cached)
            return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
    catch (err) {
        console.warn(`[Redis GET] Failed for ${cacheKey}:`, err);
    }
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        include: {
            analytics: true,
            tickets: true,
        }
    });
    if (!event || event.organizerId !== organizerId) {
        throw new Error('Event not found or you do not have permission to view its analytics.');
    }
    const analytics = event.analytics[0];
    const sold = analytics?.totalTicketsSold || 0;
    const capacity = analytics?.totalCapacity || event.maxCapacity || 0;
    const revenue = analytics?.totalRevenue || 0;
    const checkIns = analytics?.totalCheckIns || 0;
    const uniqueAttendees = await prisma_1.prisma.ticketPurchase.groupBy({
        by: ['userId'],
        where: { eventId, status: { in: ['ACTIVE', 'USED'] } },
    });
    const summary = {
        ticketsSold: sold,
        totalCapacity: capacity,
        occupancyRate: capacity > 0 ? (sold / capacity) * 100 : 0,
        revenue,
        checkIns,
        checkInRate: sold > 0 ? (checkIns / sold) * 100 : 0,
        averageTicketPrice: sold > 0 ? revenue / sold : 0,
        revenuePerAttendee: uniqueAttendees.length > 0 ? revenue / uniqueAttendees.length : 0,
    };
    const ticketBreakdown = event.tickets.map(t => {
        const stats = (analytics?.ticketsByType || []).find(a => a.type === t.name) || { sold: 0, revenue: 0 };
        return {
            type: t.name,
            sold: stats.sold,
            remaining: t.availableQuantity,
            capacity: t.totalQuantity,
            revenue: stats.revenue,
            occupancyRate: t.totalQuantity > 0 ? (stats.sold / t.totalQuantity) * 100 : 0,
            averagePrice: t.price,
        };
    });
    let cumulativeTickets = 0;
    let cumulativeRevenue = 0;
    let peakSalesDay = null;
    const salesTimeline = (analytics?.salesByDay || []).map(day => {
        cumulativeTickets += day.count;
        cumulativeRevenue += day.revenue;
        const currentDay = {
            date: day.date,
            ticketsSold: day.count,
            revenue: day.revenue,
            cumulativeTickets,
            cumulativeRevenue,
        };
        if (!peakSalesDay || currentDay.ticketsSold > peakSalesDay.ticketsSold) {
            peakSalesDay = { date: day.date, ticketsSold: day.count, revenue: day.revenue };
        }
        return currentDay;
    });
    const checkInRecords = await prisma_1.prisma.ticketPurchase.findMany({
        where: { eventId, status: 'USED', checkedInAt: { not: null } },
        select: { checkedInAt: true },
        orderBy: { checkedInAt: 'asc' },
    });
    const checkInMap = new Map();
    checkInRecords.forEach(record => {
        if (!record.checkedInAt)
            return;
        const date = new Date(record.checkedInAt);
        date.setMinutes(0, 0, 0);
        const timeStr = date.toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' });
        checkInMap.set(timeStr, (checkInMap.get(timeStr) || 0) + 1);
    });
    let cumulativeCheckIns = 0;
    const checkInTimeline = Array.from(checkInMap.entries()).map(([time, count]) => {
        cumulativeCheckIns += count;
        return { time, checkIns: count, cumulativeCheckIns };
    });
    const result = {
        event: { id: event.id, title: event.title, date: event.startTime.toISOString(), venue: event.location?.venue || '', county: event.county || '', status: event.status },
        summary, ticketBreakdown, salesTimeline, peakSalesDay, attendeeInsights: { totalUniqueAttendees: uniqueAttendees.length }, checkInTimeline,
    };
    try {
        await redis_1.redis.set(cacheKey, JSON.stringify(result), { ex: 300 });
    }
    catch (err) {
        console.warn(`[Redis SET] Failed:`, err);
    }
    return result;
};
exports.getDetailedEventAnalytics = getDetailedEventAnalytics;
const exportEventAttendeesCSV = async (organizerId, eventId) => {
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { organizerId: true }
    });
    if (!event || event.organizerId !== organizerId) {
        throw new Error('Event not found or you do not have permission to export its attendees.');
    }
    const attendees = await prisma_1.prisma.ticketPurchase.findMany({
        where: { eventId, status: { in: ['ACTIVE', 'USED'] } },
        include: {
            user: { select: { fullName: true, email: true, phoneNumber: true } },
            ticket: { select: { name: true, price: true } }
        },
        orderBy: { purchasedAt: 'desc' }
    });
    const headers = ['Name', 'Email', 'Phone', 'Ticket Type', 'Price (Kshs)', 'Purchase Date', 'Ticket Number', 'Check-in Status', 'Check-in Time'];
    const rows = attendees.map(record => {
        const escapeCSV = (str) => `"${(str || '').replace(/"/g, '""')}"`;
        const purchaseDate = record.purchasedAt ? new Date(record.purchasedAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }) : '';
        const checkInTime = record.checkedInAt ? new Date(record.checkedInAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }) : '';
        const checkInStatus = record.status === 'USED' ? 'Checked In' : 'Not Checked In';
        return [escapeCSV(record.user.fullName), escapeCSV(record.user.email), escapeCSV(record.user.phoneNumber), escapeCSV(record.ticket.name), record.ticket.price || 0, escapeCSV(purchaseDate), escapeCSV(record.ticketNumber), checkInStatus, escapeCSV(checkInTime)].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
};
exports.exportEventAttendeesCSV = exportEventAttendeesCSV;
//# sourceMappingURL=analytics.service.js.map