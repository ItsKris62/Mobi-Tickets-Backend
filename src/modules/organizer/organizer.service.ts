import { prisma } from '../../lib/prisma';
import { logAudit } from '../../lib/audit';
import { notifyAdmins } from '../notifications/notification.service';

// Get organizer analytics
export const getOrganizerAnalytics = async (organizerId: string, period: string) => {
  // Calculate date range
  const now = new Date();
  const periodMap: Record<string, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };
  const days = periodMap[period] || 30;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Get organizer's events
  const events = await prisma.event.findMany({
    where: { organizerId },
    select: { id: true, title: true },
  });

  const eventIds = events.map((e) => e.id);

  // Aggregate analytics
  const [totalTicketsSold, totalRevenue, analyticsData, uniqueAttendees] = await Promise.all([
    prisma.ticketPurchase.count({
      where: {
        eventId: { in: eventIds },
        purchasedAt: { gte: startDate },
      },
    }),
    prisma.order.aggregate({
      where: {
        eventId: { in: eventIds },
        status: 'PAID',
        createdAt: { gte: startDate },
      },
      _sum: { totalAmount: true },
    }),
    prisma.eventAnalytics.findMany({
      where: {
        eventId: { in: eventIds },
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.ticketPurchase.groupBy({
      by: ['userId'],
      where: {
        eventId: { in: eventIds },
        purchasedAt: { gte: startDate },
      },
    }),
  ]);

  // Revenue by event
  const revenueByEvent = await prisma.order.groupBy({
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

  // Revenue by month (aggregate daily analytics into monthly)
  const revenueByMonth: { month: string; revenue: number }[] = [];
  const monthMap = new Map<string, number>();
  for (const entry of analyticsData) {
    const monthKey = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + Number(entry.revenue || 0));
  }
  for (const [month, revenue] of monthMap) {
    revenueByMonth.push({ month, revenue });
  }

  // Tickets by category
  const ticketsByCategory = await prisma.ticketPurchase.groupBy({
    by: ['ticketId'],
    where: {
      eventId: { in: eventIds },
      purchasedAt: { gte: startDate },
    },
    _count: true,
  });

  // Resolve ticket categories
  const ticketIds = ticketsByCategory.map((t) => t.ticketId);
  const ticketDetails = await prisma.ticket.findMany({
    where: { id: { in: ticketIds } },
    select: { id: true, category: true },
  });

  const categoryCountMap = new Map<string, number>();
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

// Get organizer balance
export const getOrganizerBalance = async (organizerId: string) => {
  const events = await prisma.event.findMany({
    where: { organizerId },
    select: { id: true },
  });
  const eventIds = events.map((e) => e.id);

  const [totalEarnings, completedPayouts, pendingPayouts] = await Promise.all([
    prisma.order.aggregate({
      where: {
        eventId: { in: eventIds },
        status: 'PAID',
      },
      _sum: { totalAmount: true },
    }),
    prisma.payout.aggregate({
      where: {
        organizerId,
        status: 'COMPLETED',
      },
      _sum: { netAmount: true },
    }),
    prisma.payout.aggregate({
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

// Export analytics as CSV
export const exportOrganizerAnalytics = async (organizerId: string, period: string) => {
  const analytics = await getOrganizerAnalytics(organizerId, period);

  const headers = ['Event', 'Revenue', 'Orders'];
  const rows = analytics.revenueByEvent.map((r) =>
    [r.eventTitle, r.revenue, r.orders].join(',')
  );

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

// Request payout
export const requestPayout = async (
  organizerId: string,
  amount: number,
  paymentMethod: string
) => {
  // Verify balance
  const balance = await getOrganizerBalance(organizerId);
  if (amount > balance.available) {
    throw new Error(`Insufficient balance. Available: ${balance.available}, Requested: ${amount}`);
  }

  const payout = await prisma.payout.create({
    data: {
      organizerId,
      amount,
      fee: amount * 0.03, // 3% platform fee
      netAmount: amount * 0.97,
      status: 'PENDING',
      paymentMethod,
    },
  });

  await notifyAdmins(
    'SYSTEM',
    'Payout Request',
    `Organizer ${organizerId} requested a payout of KES ${amount.toLocaleString()}.`,
    { payoutId: payout.id, organizerId, amount }
  );

  await logAudit('PAYOUT_REQUESTED', 'Payout', payout.id, organizerId, {
    amount,
    paymentMethod,
  });

  return {
    message: 'Payout request submitted successfully',
    payoutId: payout.id,
  };
};

// Get organizer payouts
export const getOrganizerPayouts = async (organizerId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [payouts, total] = await Promise.all([
    prisma.payout.findMany({
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
    prisma.payout.count({ where: { organizerId } }),
  ]);

  return {
    payouts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// Apply for organizer role
export const applyForOrganizer = async (
  userId: string,
  businessName: string,
  description: string
) => {
  // Check current role
  const user = await prisma.user.findUnique({
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

  // Check for existing pending application
  const existing = await prisma.organizerApplication.findFirst({
    where: { userId, status: 'PENDING' },
  });

  if (existing) {
    throw new Error('You already have a pending organizer application');
  }

  const application = await prisma.organizerApplication.create({
    data: {
      userId,
      businessName,
      description,
    },
  });

  // Notify admins
  await notifyAdmins(
    'SYSTEM',
    'New Organizer Application',
    `A new organizer application has been submitted by user ${userId}. Business: ${businessName}`,
    { applicationId: application.id, userId, businessName }
  );

  await logAudit('ORGANIZER_APPLICATION_SUBMITTED', 'OrganizerApplication', application.id, userId, {
    businessName,
  });

  return {
    message: 'Organizer application submitted successfully',
    applicationId: application.id,
  };
};
