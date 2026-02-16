import { prisma } from '../../lib/prisma';

interface CreateAlertInput {
  type: string;
  severity: string;
  title: string;
  message: string;
  source?: string;
  metadata?: Record<string, any>;
}

interface ListAlertsFilters {
  type?: string;
  severity?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Create a new alert (can be called from other services for auto-generated alerts)
 */
export async function createAlert(input: CreateAlertInput) {
  const alert = await prisma.alert.create({
    data: {
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      source: input.source || null,
      metadata: input.metadata || undefined,
      status: 'active',
    },
  });

  return alert;
}

/**
 * Helper for auto-generating system alerts from other modules
 */
export async function createSystemAlert(
  type: string,
  severity: string,
  title: string,
  message: string,
  metadata?: Record<string, any>
) {
  try {
    return await createAlert({
      type,
      severity,
      title,
      message,
      source: 'system',
      metadata,
    });
  } catch (error) {
    // Don't let alert creation failures break the main operation
    console.error('[MobiTickets] Failed to create system alert:', error);
    return null;
  }
}

/**
 * List alerts with filtering and pagination
 */
export async function listAlerts(filters: ListAlertsFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, any> = {};
  if (filters.type) where.type = filters.type;
  if (filters.severity) where.severity = filters.severity;
  if (filters.status) where.status = filters.status;

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.alert.count({ where }),
  ]);

  return {
    alerts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, adminId: string) {
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!alert) throw new Error('Alert not found');
  if (alert.status === 'resolved') throw new Error('Alert is already resolved');

  return prisma.alert.update({
    where: { id: alertId },
    data: {
      status: 'acknowledged',
      acknowledgedBy: adminId,
      acknowledgedAt: new Date(),
    },
  });
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string, adminId: string) {
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!alert) throw new Error('Alert not found');

  return prisma.alert.update({
    where: { id: alertId },
    data: {
      status: 'resolved',
      resolvedBy: adminId,
      resolvedAt: new Date(),
    },
  });
}
