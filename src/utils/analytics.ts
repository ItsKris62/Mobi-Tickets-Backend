import { prisma } from '../lib/prisma';

/**
 * Computes and upserts analytics for a given event.
 * This function is the source of truth for all event-level metrics.
 * It should be called after ticket purchases or check-ins.
 */
export async function computeEventAnalytics(eventId: string) {
  // 1. Total tickets sold (excluding cancelled/refunded)
  const ticketsSold = await prisma.ticketPurchase.count({
    where: { eventId, status: { in: ['ACTIVE', 'USED'] } }
  });

  // 2. Total revenue
  const revenueResult = await prisma.ticketPurchase.findMany({
    where: { eventId, status: { in: ['ACTIVE', 'USED'] } },
    include: { ticket: { select: { price: true } } }
  });
  const totalRevenue = revenueResult.reduce((sum, p) => sum + (p.ticket?.price || 0), 0);

  // 3. Total capacity
  const capacityResult = await prisma.ticket.aggregate({
    _sum: { totalQuantity: true },
    where: { eventId }
  });
  const totalCapacity = capacityResult._sum.totalQuantity || 0;

  // 4. Total check-ins
  const totalCheckIns = await prisma.ticketPurchase.count({
    where: { eventId, status: 'USED', checkedInAt: { not: null } }
  });

  // 5. Tickets sold by type
  const ticketsByTypeResult = await prisma.ticketPurchase.groupBy({
    by: ['ticketId'],
    where: { eventId, status: { in: ['ACTIVE', 'USED'] } },
    _count: true,
  });
  const ticketsByType = await Promise.all(
    ticketsByTypeResult.map(async (group) => {
      const type = await prisma.ticket.findUnique({ where: { id: group.ticketId } });
      return {
        type: type?.name || 'Unknown',
        sold: group._count,
        revenue: group._count * (type?.price || 0),
        capacity: type?.totalQuantity || 0,
      };
    })
  );

  // 6. Sales by day (raw query for performance)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const salesByDay: any[] = await prisma.$queryRaw`
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

  // 7. Upsert analytics record
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

  return await prisma.eventAnalytics.upsert({
    where: { eventId },
    create: analyticsData,
    update: analyticsData,
  });
}
