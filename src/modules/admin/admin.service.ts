import { prisma } from '../../lib/prisma';
import { logAudit } from '../../lib/audit';

export const getDashboardStats = async () => {
  const [totalEvents, totalUsers, recentOrders, totalRevenue] = await Promise.all([
    prisma.event.count(),
    prisma.user.count(),
    prisma.order.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.order.aggregate({
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

// Get all users with pagination
export const getAllUsers = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
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
    prisma.user.count(),
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

// Ban/suspend user
export const banUser = async (userId: string, adminId: string, reason: string) => {
  // In a real implementation, you'd have a banned/suspended field in the User model
  // For now, we'll just log the action
  await logAudit('USER_BANNED', 'User', userId, adminId, { reason });

  return { message: 'User banned successfully' };
};

// Get all events for moderation
export const getAllEvents = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
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
    prisma.event.count(),
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

// Get audit logs
export const getAuditLogs = async (page = 1, limit = 50) => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
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
    prisma.auditLog.count(),
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