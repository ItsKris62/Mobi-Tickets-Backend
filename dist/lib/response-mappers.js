"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapUserToFrontend = mapUserToFrontend;
exports.mapAuditLogToFrontend = mapAuditLogToFrontend;
exports.mapEventToFrontend = mapEventToFrontend;
exports.mapOrganizerRequestToFrontend = mapOrganizerRequestToFrontend;
exports.mapRefundRequestToFrontend = mapRefundRequestToFrontend;
function mapUserToFrontend(user) {
    const roleMap = {
        ATTENDEE: 'attendee',
        ORGANIZER: 'organizer',
        ADMIN: 'admin',
    };
    const ec = user.emergencyContact;
    return {
        id: user.id,
        name: user.fullName || user.email,
        email: user.email,
        phone: user.phoneNumber || '',
        avatar: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
        role: roleMap[user.role] || 'attendee',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : '',
        idNumber: user.idNumber || '',
        county: user.county || '',
        city: user.city || '',
        emergencyContact: {
            name: ec?.name || '',
            phone: ec?.phoneNumber || ec?.phone || '',
            relationship: ec?.relationship || '',
        },
        joinedDate: user.createdAt.toISOString().split('T')[0],
        status: user.isBanned ? 'inactive' : (user.isActive ? 'active' : 'inactive'),
        bookedEvents: [],
        likedEvents: [],
    };
}
function deriveLogType(action) {
    const upper = action.toUpperCase();
    if (upper.includes('BANNED') || upper.includes('CANCELLED') || upper.includes('REJECTED') || upper.includes('SUSPENDED')) {
        return 'warning';
    }
    if (upper.includes('FAILED') || upper.includes('ERROR') || upper.includes('DENIED')) {
        return 'error';
    }
    if (upper.includes('CREATED') || upper.includes('APPROVED') || upper.includes('PUBLISHED') || upper.includes('COMPLETED') || upper.includes('UNBANNED')) {
        return 'success';
    }
    return 'info';
}
function deriveLogStatus(action) {
    const type = deriveLogType(action);
    if (type === 'error')
        return 'error';
    if (type === 'warning')
        return 'warning';
    return 'success';
}
function buildLogMessage(action, entity, entityId, data) {
    const actionReadable = action.replace(/_/g, ' ').toLowerCase();
    const entityLower = entity.toLowerCase();
    const details = [];
    if (data) {
        if (data.reason)
            details.push(`Reason: ${data.reason}`);
        if (data.status)
            details.push(`Status: ${data.status}`);
        if (data.eventTitle)
            details.push(`Event: ${data.eventTitle}`);
        if (data.businessName)
            details.push(`Business: ${data.businessName}`);
    }
    let message = `${actionReadable} on ${entityLower}`;
    if (entityId)
        message += ` (${entityId.slice(0, 8)}...)`;
    if (details.length > 0)
        message += ` — ${details.join(', ')}`;
    return message.charAt(0).toUpperCase() + message.slice(1);
}
function mapAuditLogToFrontend(log) {
    return {
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        userId: log.user?.id,
        user: log.user?.fullName || log.user?.email || undefined,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId || '',
        ipAddress: log.ipAddress || '',
        status: deriveLogStatus(log.action),
        type: deriveLogType(log.action),
        message: buildLogMessage(log.action, log.entity, log.entityId, log.data),
    };
}
function mapEventToFrontend(event) {
    const tickets = event.tickets || [];
    const pricing = {};
    const capacity = {};
    const sold = {};
    const ticketTypes = [];
    const ticketIds = {};
    for (const ticket of tickets) {
        const cat = ticket.category.toLowerCase();
        ticketTypes.push(cat);
        ticketIds[cat] = ticket.id;
        pricing[cat] = Number(ticket.price) || 0;
        capacity[cat] = ticket.totalQuantity;
        sold[cat] = ticket.totalQuantity - ticket.availableQuantity;
    }
    if (ticketTypes.length === 0) {
        ticketTypes.push('regular');
        pricing.regular = 0;
        capacity.regular = event.maxCapacity || 0;
        sold.regular = 0;
    }
    const loc = event.location;
    const statusMap = {
        DRAFT: 'draft',
        PUBLISHED: 'published',
        POSTPONED: 'postponed',
        CANCELLED: 'cancelled',
        COMPLETED: 'completed',
    };
    return {
        id: event.id,
        title: event.title,
        description: event.description || '',
        date: event.startTime.toISOString().split('T')[0],
        time: event.startTime.toTimeString().slice(0, 5),
        venue: loc?.venue || '',
        county: loc?.address || '',
        city: '',
        posterUrl: event.posterUrl || '',
        category: event.category || '',
        organizerId: event.organizerId,
        organizerName: event.organizer?.fullName || event.organizer?.email || '',
        ticketTypes,
        ticketIds,
        pricing,
        capacity,
        sold,
        status: statusMap[event.status] || event.status.toLowerCase(),
        featured: event.isFeatured,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
    };
}
function mapOrganizerRequestToFrontend(app) {
    return {
        id: app.id,
        userId: app.userId,
        userName: app.user?.fullName || app.user?.email || '',
        email: app.user?.email || '',
        status: app.status.toLowerCase(),
        requestDate: app.createdAt.toISOString().split('T')[0],
        documents: app.description || '',
    };
}
function mapRefundRequestToFrontend(req) {
    return {
        id: req.id,
        ticketId: req.orderId,
        userId: req.userId,
        userName: req.user?.fullName || req.user?.email || '',
        eventTitle: req.order?.event?.title || '',
        reason: req.reason,
        status: req.status.toLowerCase(),
        requestDate: req.createdAt.toISOString().split('T')[0],
        amount: Number(req.amount) || 0,
    };
}
//# sourceMappingURL=response-mappers.js.map