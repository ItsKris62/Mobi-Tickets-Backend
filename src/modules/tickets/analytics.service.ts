import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';

function calculatePercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function getTrendDirection(change: number): 'up' | 'down' | 'flat' {
  if (change > 0.1) return 'up';
  if (change < -0.1) return 'down';
  return 'flat';
}

/**
 * Invalidates all analytics cache keys for a specific organizer.
 */
export async function invalidateOrganizerAnalyticsCache(organizerId: string): Promise<void> {
  try {
    let cursor: number = 0;
    const matchPattern = `analytics:org:${organizerId}:*`;
    do {
      const result = await redis.scan(cursor, { match: matchPattern, count: 100 });
      cursor = Number(result[0]);
      const keys = result[1] as string[];
      if (keys.length > 0) {
        await Promise.all(keys.map((k) => redis.del(k)));
      }
    } while (cursor !== 0);
  } catch (err) {
    console.warn(`[invalidateOrganizerAnalyticsCache] Failed for organizer ${organizerId}:`, err);
  }
}

/**
 * GET /api/analytics/organizer/summary
 * Returns aggregate metrics across ALL of the organizer's events.
 */
export const getOrganizerSummary = async (organizerId: string, startDate?: Date, endDate?: Date) => {
  const period = {
    end: endDate || new Date(),
    start: startDate || new Date(new Date().setDate(new Date().getDate() - 30)),
  };
  const periodDuration = period.end.getTime() - period.start.getTime();
  const previousPeriod = {
    start: new Date(period.start.getTime() - periodDuration),
    end: period.start,
  };

  // 1. Fetch all event IDs for this organizer
  const organizerEvents = await prisma.event.findMany({
    where: { organizerId },
    select: { id: true, status: true },
  });
  const organizerEventIds = organizerEvents.map(e => e.id);

  if (organizerEventIds.length === 0) {
    // Return zeroed-out summary if organizer has no events
    return { totalEvents: 0, totalTicketsSold: 0, totalRevenue: 0, totalCapacity: 0, overallOccupancyRate: 0, totalCheckIns: 0, checkInRate: 0, eventsByStatus: {}, revenueTrend: { current: 0, previous: 0, changePercent: 0, direction: 'flat' }, ticketsTrend: { current: 0, previous: 0, changePercent: 0, direction: 'flat' } };
  }

  // 2. Aggregate analytics from the materialized view
  const analyticsWhere = { eventId: { in: organizerEventIds } };
  const [
    totalTicketsSold,
    totalRevenue,
    totalCapacity,
    totalCheckIns,
  ] = await Promise.all([
    prisma.eventAnalytics.aggregate({ where: analyticsWhere, _sum: { totalTicketsSold: true } }),
    prisma.eventAnalytics.aggregate({ where: analyticsWhere, _sum: { totalRevenue: true } }),
    prisma.eventAnalytics.aggregate({ where: analyticsWhere, _sum: { totalCapacity: true } }),
    prisma.eventAnalytics.aggregate({ where: analyticsWhere, _sum: { totalCheckIns: true } }),
  ]);

  // 3. Aggregate trend data from raw purchases using performant raw queries
  const revenueTrendCurrent: [{ total: number | null }] = await prisma.$queryRaw`
    SELECT SUM(t.price) as total FROM "ticket_purchases" tp
    JOIN "tickets" t ON tp."ticketId" = t.id
    WHERE tp."eventId" = ANY(ARRAY[${Prisma.join(organizerEventIds)}])
    AND tp."purchasedAt" >= ${period.start} AND tp."purchasedAt" < ${period.end}
  `;
  const revenueTrendPrevious: [{ total: number | null }] = await prisma.$queryRaw`
    SELECT SUM(t.price) as total FROM "ticket_purchases" tp
    JOIN "tickets" t ON tp."ticketId" = t.id
    WHERE tp."eventId" = ANY(ARRAY[${Prisma.join(organizerEventIds)}])
    AND tp."purchasedAt" >= ${previousPeriod.start} AND tp."purchasedAt" < ${previousPeriod.end}
  `;

  const ticketsTrendCurrent = await prisma.ticketPurchase.count({
    where: { eventId: { in: organizerEventIds }, purchasedAt: { gte: period.start, lt: period.end } },
  });
  const ticketsTrendPrevious = await prisma.ticketPurchase.count({
    where: { eventId: { in: organizerEventIds }, purchasedAt: { gte: previousPeriod.start, lt: previousPeriod.end } },
  });

  // 4. Format event status counts
  const eventsByStatus = organizerEvents.reduce((acc, event) => {
    acc[event.status] = (acc[event.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 5. Assemble response
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

// NOTE: Stubs for other required endpoints.
export const getRevenueTimeSeries = async (organizerId: string) => {
  return { data: [], totalRevenue: 0, interval: 'daily' };
};

/**
 * GET /api/analytics/organizer/events
 * Per-event performance breakdown for an organizer.
 */
export const getEventPerformance = async (organizerId: string, options: {
  status?: string;
  sortBy?: 'revenue' | 'ticketsSold' | 'occupancyRate' | 'checkInRate';
  order?: 'asc' | 'desc';
}) => {
  const { status, sortBy = 'revenue', order = 'desc' } = options;

  const cacheKey = `analytics:org:${organizerId}:events:${JSON.stringify(options)}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (err) {
    console.warn(`[Redis GET] Failed for ${cacheKey}:`, err);
  }

  const events = await prisma.event.findMany({
    where: {
      organizerId,
      ...(status && { status: status.toUpperCase() as any }),
    },
    include: {
      analytics: true, // Relation to EventAnalytics
    },
    orderBy: {
      startTime: 'desc',
    }
  });

  const performanceData = events.map(event => {
    const analytics = event.analytics[0]; // EventAnalytics is 1-to-1 but Prisma generates a list

    const sold = analytics?.totalTicketsSold || 0;
    const capacity = analytics?.totalCapacity || event.maxCapacity || 0;
    const checkIns = analytics?.totalCheckIns || 0;
    const revenue = analytics?.totalRevenue || 0;

    const occupancyRate = capacity > 0 ? (sold / capacity) * 100 : 0;
    const checkInRate = sold > 0 ? (checkIns / sold) * 100 : 0;

    const ticketsByType = ((analytics?.ticketsByType as any[]) || []).map(t => ({
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
      venue: (event.location as any)?.venue || '',
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

  // Sorting logic
  performanceData.sort((a, b) => {
    const valA = a.metrics[sortBy] || 0;
    const valB = b.metrics[sortBy] || 0;
    return order === 'asc' ? valA - valB : valB - valA;
  });

  const result = { events: performanceData };

  try {
    await redis.set(cacheKey, JSON.stringify(result), { ex: 300 }); // Cache for 5 minutes
  } catch (err) {
    console.warn(`[Redis SET] Failed for ${cacheKey}:`, err);
  }

  return result;
};

/**
 * GET /api/analytics/organizer/events/:eventId/detailed
 * Deep-dive analytics for a single event.
 */
export const getDetailedEventAnalytics = async (organizerId: string, eventId: string) => {
  const cacheKey = `analytics:org:${organizerId}:event:${eventId}:detailed`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (err) {
    console.warn(`[Redis GET] Failed for ${cacheKey}:`, err);
  }

  // 1. Fetch Event & Verify Ownership
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      analytics: true,
      tickets: true,
    }
  });

  if (!event || event.organizerId !== organizerId) {
    throw new Error('Event not found or you do not have permission to view its analytics.');
  }

  const analytics = event.analytics[0]; // Relation is an array, but logically 1-to-1
  
  // 2. Base Metrics
  const sold = analytics?.totalTicketsSold || 0;
  const capacity = analytics?.totalCapacity || event.maxCapacity || 0;
  const revenue = analytics?.totalRevenue || 0;
  const checkIns = analytics?.totalCheckIns || 0;

  // 3. Attendee Insights (Unique Buyers)
  const uniqueAttendees = await prisma.ticketPurchase.groupBy({
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

  // 4. Ticket Type Breakdown
  const ticketBreakdown = event.tickets.map(t => {
    const stats = ((analytics?.ticketsByType as any[]) || []).find(a => a.type === t.name) || { sold: 0, revenue: 0 };
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

  // 5. Sales Timeline & Peak Sales Day
  let cumulativeTickets = 0;
  let cumulativeRevenue = 0;
  let peakSalesDay = null;

  const salesTimeline = ((analytics?.salesByDay as any[]) || []).map(day => {
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

  // 6. Check-In Timeline (Grouped by Hour)
  const checkInRecords = await prisma.ticketPurchase.findMany({
    where: { eventId, status: 'USED', checkedInAt: { not: null } },
    select: { checkedInAt: true },
    orderBy: { checkedInAt: 'asc' },
  });

  const checkInMap = new Map<string, number>();
  checkInRecords.forEach(record => {
    if (!record.checkedInAt) return;
    const date = new Date(record.checkedInAt);
    date.setMinutes(0, 0, 0); // Round down to the top of the hour
    // Format to Kenyan Time (EAT)
    const timeStr = date.toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' });
    checkInMap.set(timeStr, (checkInMap.get(timeStr) || 0) + 1);
  });

  let cumulativeCheckIns = 0;
  const checkInTimeline = Array.from(checkInMap.entries()).map(([time, count]) => {
    cumulativeCheckIns += count;
    return { time, checkIns: count, cumulativeCheckIns };
  });

  const result = {
    event: { id: event.id, title: event.title, date: event.startTime.toISOString(), venue: (event.location as any)?.venue || '', county: event.county || '', status: event.status },
    summary, ticketBreakdown, salesTimeline, peakSalesDay, attendeeInsights: { totalUniqueAttendees: uniqueAttendees.length }, checkInTimeline,
  };

  try { await redis.set(cacheKey, JSON.stringify(result), { ex: 300 }); } catch (err) { console.warn(`[Redis SET] Failed:`, err); }
  return result;
};

/**
 * Exports the attendee list for a specific event as a CSV string.
 */
export const exportEventAttendeesCSV = async (organizerId: string, eventId: string): Promise<string> => {
  // 1. Verify Event Ownership
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true }
  });

  if (!event || event.organizerId !== organizerId) {
    throw new Error('Event not found or you do not have permission to export its attendees.');
  }

  // 2. Fetch Attendees
  const attendees = await prisma.ticketPurchase.findMany({
    where: { eventId, status: { in: ['ACTIVE', 'USED'] } },
    include: {
      user: { select: { fullName: true, email: true, phoneNumber: true } },
      ticket: { select: { name: true, price: true } }
    },
    orderBy: { purchasedAt: 'desc' }
  });

  // 3. Build CSV Header
  const headers = ['Name', 'Email', 'Phone', 'Ticket Type', 'Price (Kshs)', 'Purchase Date', 'Ticket Number', 'Check-in Status', 'Check-in Time'];
  
  // 4. Build CSV Rows safely escaping quotes and commas
  const rows = attendees.map(record => {
    const escapeCSV = (str: string | null | undefined) => `"${(str || '').replace(/"/g, '""')}"`;
    
    const purchaseDate = record.purchasedAt ? new Date(record.purchasedAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }) : '';
    const checkInTime = record.checkedInAt ? new Date(record.checkedInAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }) : '';
    const checkInStatus = record.status === 'USED' ? 'Checked In' : 'Not Checked In';

    return [escapeCSV(record.user.fullName), escapeCSV(record.user.email), escapeCSV(record.user.phoneNumber), escapeCSV(record.ticket.name), record.ticket.price || 0, escapeCSV(purchaseDate), escapeCSV(record.ticketNumber), checkInStatus, escapeCSV(checkInTime)].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};