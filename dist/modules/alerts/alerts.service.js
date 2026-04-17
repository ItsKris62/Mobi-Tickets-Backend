"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAlert = createAlert;
exports.createSystemAlert = createSystemAlert;
exports.listAlerts = listAlerts;
exports.acknowledgeAlert = acknowledgeAlert;
exports.resolveAlert = resolveAlert;
const prisma_1 = require("../../lib/prisma");
async function createAlert(input) {
    const alert = await prisma_1.prisma.alert.create({
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
async function createSystemAlert(type, severity, title, message, metadata) {
    try {
        return await createAlert({
            type,
            severity,
            title,
            message,
            source: 'system',
            metadata,
        });
    }
    catch (error) {
        console.error('[MobiTickets] Failed to create system alert:', error);
        return null;
    }
}
async function listAlerts(filters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const where = {};
    if (filters.type)
        where.type = filters.type;
    if (filters.severity)
        where.severity = filters.severity;
    if (filters.status)
        where.status = filters.status;
    const [alerts, total] = await Promise.all([
        prisma_1.prisma.alert.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma_1.prisma.alert.count({ where }),
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
async function acknowledgeAlert(alertId, adminId) {
    const alert = await prisma_1.prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert)
        throw new Error('Alert not found');
    if (alert.status === 'resolved')
        throw new Error('Alert is already resolved');
    return prisma_1.prisma.alert.update({
        where: { id: alertId },
        data: {
            status: 'acknowledged',
            acknowledgedBy: adminId,
            acknowledgedAt: new Date(),
        },
    });
}
async function resolveAlert(alertId, adminId) {
    const alert = await prisma_1.prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert)
        throw new Error('Alert not found');
    return prisma_1.prisma.alert.update({
        where: { id: alertId },
        data: {
            status: 'resolved',
            resolvedBy: adminId,
            resolvedAt: new Date(),
        },
    });
}
//# sourceMappingURL=alerts.service.js.map