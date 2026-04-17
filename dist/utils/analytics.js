"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEventAnalytics = computeEventAnalytics;
const prisma_1 = require("../lib/prisma");
async function computeEventAnalytics(eventId) {
    const ticketsSold = await prisma_1.prisma.ticketPurchase.count({
        where: { eventId, status: { in: ['ACTIVE', 'USED'] } }
    });
    const revenueResult = await prisma_1.prisma.ticketPurchase.findMany({
        where: { eventId, status: { in: ['ACTIVE', 'USED'] } },
        include: { ticket: { select: { price: true } } }
    });
    const totalRevenue = revenueResult.reduce((sum, p) => sum + (p.ticket?.price || 0), 0);
    const capacityResult = await prisma_1.prisma.ticket.aggregate({
        _sum: { totalQuantity: true },
        where: { eventId }
    });
    const totalCapacity = capacityResult._sum.totalQuantity || 0;
    const totalCheckIns = await prisma_1.prisma.ticketPurchase.count({
        where: { eventId, status: 'USED', checkedInAt: { not: null } }
    });
    const ticketsByTypeResult = await prisma_1.prisma.ticketPurchase.groupBy({
        by: ['ticketId'],
        where: { eventId, status: { in: ['ACTIVE', 'USED'] } },
        _count: true,
    });
    const ticketsByType = await Promise.all(ticketsByTypeResult.map(async (group) => {
        const type = await prisma_1.prisma.ticket.findUnique({ where: { id: group.ticketId } });
        return {
            type: type?.name || 'Unknown',
            sold: group._count,
            revenue: group._count * (type?.price || 0),
            capacity: type?.totalQuantity || 0,
        };
    }));
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const salesByDay = await prisma_1.prisma.$queryRaw `
    SELECT 
      DATE("purchasedAt") as date,
      COUNT(*)::int as count,
      SUM(t.price) as revenue
    FROM "ticket_purchases" tp
    JOIN "tickets" t ON tp."ticketId" = t.id
    WHERE tp."eventId" = ${eventId}
      AND tp.status IN ('ACTIVE', 'USED')
      AND tp."purchasedAt" >= ${thirtyDaysAgo}
    GROUP BY DATE("purchasedAt")
    ORDER BY date ASC
  `;
    const analyticsData = {
        eventId,
        totalTicketsSold: ticketsSold,
        totalRevenue,
        totalCapacity,
        totalCheckIns,
        ticketsByType,
        salesByDay: salesByDay.map(s => ({ ...s, date: new Date(s.date).toISOString().split('T')[0] })),
        lastUpdated: new Date(),
    };
    return await prisma_1.prisma.eventAnalytics.upsert({
        where: { eventId },
        create: analyticsData,
        update: analyticsData,
    });
}
//# sourceMappingURL=analytics.js.map