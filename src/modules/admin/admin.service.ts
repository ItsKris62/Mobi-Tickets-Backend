import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logAudit } from '../../lib/audit';
import { createNotification } from '../notifications/notification.service';
import {
  mapUserToFrontend,
  mapAuditLogToFrontend,
  mapEventToFrontend,
  mapOrganizerRequestToFrontend,
  mapRefundRequestToFrontend,
} from '../../lib/response-mappers';
import { cancelEvent } from '../events/events.service';
import { createSystemAlert } from '../alerts/alerts.service';

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

// Get all users with pagination, search, and role filtering
export const getAllUsers = async (
  page = 1,
  limit = 20,
  options?: { search?: string; role?: string }
) => {
  const skip = (page - 1) * limit;

  const where: any = {};
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
    prisma.user.findMany({
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
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(mapUserToFrontend),
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
  await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: true,
      bannedAt: new Date(),
      bannedReason: reason,
      isActive: false,
    },
  });

  await logAudit('USER_BANNED', 'User', userId, adminId, { reason });

  // Auto-generate system alert
  await createSystemAlert(
    'user',
    'medium',
    'User Banned',
    `User ${userId} was banned. Reason: ${reason}`,
    { userId, reason, bannedBy: adminId }
  );

  return { message: 'User banned successfully', success: true };
};

// Unban user
export const unbanUser = async (userId: string, adminId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: false,
      bannedAt: null,
      bannedReason: null,
      isActive: true,
    },
  });

  await logAudit('USER_UNBANNED', 'User', userId, adminId);

  return { message: 'User unbanned successfully', success: true };
};

// Change user role
export const changeUserRole = async (
  userId: string,
  newRole: 'ATTENDEE' | 'ORGANIZER' | 'ADMIN',
  adminId: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) throw new Error('User not found');

  const oldRole = user.role;
  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  await logAudit('USER_ROLE_CHANGED', 'User', userId, adminId, {
    oldRole,
    newRole,
  });

  return { message: `User role changed to ${newRole}`, success: true };
};

// Get all events for moderation (with tickets + organizer for frontend mapping)
export const getAllEvents = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
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
    prisma.event.count({ where: { deletedAt: null } }),
  ]);

  return {
    events: events.map(mapEventToFrontend),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Get audit logs with optional type filter
export const getAuditLogs = async (
  page = 1,
  limit = 50,
  options?: { type?: string; search?: string }
) => {
  const skip = (page - 1) * limit;

  const where: any = {};

  // Filter by derived type (map type back to action patterns)
  if (options?.type && options.type !== 'all') {
    const typeActionMap: Record<string, string[]> = {
      warning: ['BANNED', 'CANCELLED', 'REJECTED', 'SUSPENDED'],
      error: ['FAILED', 'ERROR', 'DENIED'],
      success: ['CREATED', 'APPROVED', 'PUBLISHED', 'COMPLETED', 'UNBANNED'],
      info: [], // default — we'll handle this differently
    };

    const patterns = typeActionMap[options.type];
    if (patterns && patterns.length > 0) {
      where.OR = patterns.map((p) => ({ action: { contains: p } }));
    } else if (options.type === 'info') {
      // Info = NOT matching any of the other patterns
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
    prisma.auditLog.findMany({
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
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map(mapAuditLogToFrontend),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Export audit logs as CSV or JSON
export const exportAuditLogs = async (
  format: 'csv' | 'json' = 'csv',
  options?: { type?: string; startDate?: string; endDate?: string }
) => {
  const where: any = {};

  if (options?.startDate) {
    where.createdAt = { ...where.createdAt, gte: new Date(options.startDate) };
  }
  if (options?.endDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(options.endDate) };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10000, // reasonable upper limit
    include: {
      user: {
        select: { id: true, email: true, fullName: true },
      },
    },
  });

  const mapped = logs.map(mapAuditLogToFrontend);

  if (format === 'json') {
    return JSON.stringify(mapped, null, 2);
  }

  // CSV format
  const headers = ['ID', 'Timestamp', 'Type', 'Action', 'Entity', 'EntityID', 'User', 'IP', 'Status', 'Message'];
  const rows = mapped.map((l) =>
    [l.id, l.timestamp, l.type, l.action, l.entity, l.entityId, l.user || '', l.ipAddress, l.status, `"${l.message.replace(/"/g, '""')}"`].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
};

// Admin cancel event (delegates to events.service.cancelEvent)
export const adminCancelEvent = async (
  eventId: string,
  reason: string,
  adminId: string
) => {
  return cancelEvent(eventId, adminId, 'ADMIN', reason);
};

// System health check
export const getSystemHealth = async () => {
  let dbStatus = 'unknown';
  let redisStatus = 'unknown';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  try {
    const pong = await redis.ping();
    redisStatus = pong === 'PONG' ? 'connected' : 'error';
  } catch {
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

// Toggle featured event
export const featureEvent = async (eventId: string, featured: boolean, adminId: string) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new Error('Event not found');
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      isFeatured: featured,
      featuredAt: featured ? new Date() : null,
    },
  });

  await logAudit(
    featured ? 'EVENT_FEATURED' : 'EVENT_UNFEATURED',
    'Event',
    eventId,
    adminId
  );

  return { message: featured ? 'Event featured successfully' : 'Event unfeatured successfully' };
};

// Get organizer applications
export const getOrganizerRequests = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    prisma.organizerApplication.findMany({
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
    prisma.organizerApplication.count(),
  ]);

  return {
    requests: requests.map(mapOrganizerRequestToFrontend),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// Review organizer application
export const reviewOrganizerRequest = async (
  requestId: string,
  adminId: string,
  status: 'APPROVED' | 'REJECTED',
  notes?: string
) => {
  const application = await prisma.organizerApplication.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });

  if (!application) {
    throw new Error('Application not found');
  }

  if (application.status !== 'PENDING') {
    throw new Error('Application has already been reviewed');
  }

  await prisma.organizerApplication.update({
    where: { id: requestId },
    data: {
      status,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      reviewNotes: notes,
    },
  });

  // If approved, upgrade user role to ORGANIZER
  if (status === 'APPROVED') {
    await prisma.user.update({
      where: { id: application.userId },
      data: { role: 'ORGANIZER' },
    });
  }

  // Notify the applicant
  await createNotification({
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

  await logAudit('ORGANIZER_APPLICATION_REVIEWED', 'OrganizerApplication', requestId, adminId, {
    status,
    notes,
    userId: application.userId,
  });

  return { message: `Application ${status.toLowerCase()} successfully` };
};

// Get refund requests
export const getRefundRequests = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    prisma.refundRequest.findMany({
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
    prisma.refundRequest.count(),
  ]);

  return {
    requests: requests.map(mapRefundRequestToFrontend),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// Review refund request
export const reviewRefundRequest = async (
  requestId: string,
  adminId: string,
  status: 'APPROVED' | 'REJECTED',
  notes?: string
) => {
  const refundReq = await prisma.refundRequest.findUnique({
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

  await prisma.refundRequest.update({
    where: { id: requestId },
    data: {
      status,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  });

  // If approved, mark order as refunded
  if (status === 'APPROVED') {
    await prisma.order.update({
      where: { id: refundReq.orderId },
      data: { status: 'REFUNDED' },
    });

    // Mark related ticket purchases as refunded
    await prisma.ticketPurchase.updateMany({
      where: { orderId: refundReq.orderId },
      data: { status: 'REFUNDED' },
    });
  }

  // Notify user
  await createNotification({
    userId: refundReq.userId,
    eventId: refundReq.order.eventId,
    type: 'REFUND_PROCESSED',
    title: status === 'APPROVED' ? 'Refund Approved' : 'Refund Request Update',
    message: status === 'APPROVED'
      ? `Your refund of KES ${refundReq.amount} has been approved and will be processed shortly.`
      : `Your refund request has been reviewed. Status: ${status}.${notes ? ` Notes: ${notes}` : ''}`,
    data: { refundRequestId: requestId, status, amount: refundReq.amount },
  });

  await logAudit('REFUND_REQUEST_REVIEWED', 'RefundRequest', requestId, adminId, {
    status,
    notes,
    amount: refundReq.amount,
    orderId: refundReq.orderId,
  });

  return { message: `Refund request ${status.toLowerCase()} successfully` };
};
