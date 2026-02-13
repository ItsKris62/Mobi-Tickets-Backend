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
  const [totalTicketsSold, totalRevenue, analyticsData] = await Promise.all([
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

  return {
    period,
    totalEvents: events.length,
    totalTicketsSold,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    revenueByEvent: revenueByEventWithNames,
    dailyAnalytics: analyticsData,
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
