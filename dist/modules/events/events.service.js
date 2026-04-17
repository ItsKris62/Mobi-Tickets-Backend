"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventAttendees = exports.getFeaturedEvents = exports.getOrganizerEvents = exports.publishEvent = exports.cancelEvent = exports.postponeEvent = exports.deleteEvent = exports.updateEvent = exports.getEventById = exports.getEvents = exports.createEvent = void 0;
const prisma_1 = require("../../lib/prisma");
const redis_1 = require("../../lib/redis");
const cloudinary_1 = require("../../lib/cloudinary");
const notification_service_1 = require("../notifications/notification.service");
const audit_1 = require("../../lib/audit");
const alerts_service_1 = require("../alerts/alerts.service");
async function invalidateEventsListCache() {
    try {
        let cursor = 0;
        do {
            const result = await redis_1.redis.scan(cursor, { match: 'events:list:*', count: 100 });
            cursor = Number(result[0]);
            const keys = result[1];
            if (keys.length > 0) {
                await Promise.all(keys.map((k) => redis_1.redis.del(k)));
            }
        } while (cursor !== 0);
    }
    catch (err) {
        console.warn('[invalidateEventsListCache] Failed:', err);
    }
}
async function getCache(key) {
    try {
        const cached = await redis_1.redis.get(key);
        if (cached)
            return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
    catch (err) {
        console.warn(`[Redis GET] Failed for ${key}:`, err);
    }
    return null;
}
async function setCache(key, data, ttlSeconds = 60) {
    try {
        await redis_1.redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
    }
    catch (err) {
        console.warn(`[Redis SET] Failed for ${key}:`, err);
    }
}
const createEvent = async (data, organizerId, posterFile, trailerFile) => {
    const { tickets: _tickets, posterUrl: posterUrlFromBody, ...rest } = data;
    let posterUrl = posterUrlFromBody;
    let videoUrl;
    if (posterFile)
        posterUrl = await (0, cloudinary_1.uploadEventPoster)(posterFile);
    if (trailerFile)
        videoUrl = await (0, cloudinary_1.uploadEventTrailer)(trailerFile);
    const ticketsInput = _tickets ?? [];
    const ticketsToCreate = ticketsInput.length > 0
        ? ticketsInput.map((t) => ({
            category: t.category,
            name: t.name,
            price: Number(t.price),
            totalQuantity: Number(t.quantity),
            availableQuantity: Number(t.quantity),
        }))
        : rest.maxCapacity
            ? [
                {
                    category: 'REGULAR',
                    name: 'Regular',
                    price: 0,
                    totalQuantity: rest.maxCapacity ?? 0,
                    availableQuantity: rest.maxCapacity ?? 0,
                },
            ]
            : [];
    const derivedMaxCapacity = ticketsToCreate.length > 0
        ? ticketsToCreate.reduce((sum, t) => sum + (t.totalQuantity || 0), 0)
        : rest.maxCapacity ?? undefined;
    return prisma_1.prisma.event.create({
        data: {
            ...rest,
            organizerId,
            posterUrl,
            videoUrl,
            isPublished: false,
            maxCapacity: derivedMaxCapacity,
            tickets: {
                create: ticketsToCreate,
            },
        },
    });
};
exports.createEvent = createEvent;
function formatPublicEvent(event) {
    const location = (typeof event.location === 'object' && event.location !== null)
        ? event.location
        : {};
    const availableTickets = (event.tickets || []).filter((t) => t.status === 'AVAILABLE' && t.availableQuantity > 0);
    const prices = availableTickets.map((t) => Number(t.price));
    const totalAvailable = (event.tickets || []).reduce((sum, t) => sum + (t.availableQuantity || 0), 0);
    return {
        id: event.id,
        title: event.title,
        description: event.description ? event.description.substring(0, 200) : '',
        posterUrl: event.posterUrl || null,
        category: event.category || 'OTHER',
        venue: location.venue || '',
        location: location.address || '',
        county: event.county || '',
        startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
        endTime: event.endTime
            ? (event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime)
            : null,
        isFeatured: event.isFeatured ?? false,
        organizer: {
            id: event.organizer.id,
            name: event.organizer.fullName || '',
            avatarUrl: event.organizer.avatarUrl || null,
        },
        ticketSummary: {
            lowestPrice: prices.length > 0 ? Math.min(...prices) : 0,
            highestPrice: prices.length > 0 ? Math.max(...prices) : 0,
            totalAvailable,
            categories: (event.tickets || []).map((t) => ({
                id: t.id,
                name: t.name,
                category: t.category,
                price: Number(t.price),
                availableQuantity: t.availableQuantity,
                available: t.availableQuantity,
                totalQuantity: t.totalQuantity,
            })),
        },
        isSoldOut: totalAvailable === 0,
        createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
        publishedAt: event.publishedAt
            ? (event.publishedAt instanceof Date ? event.publishedAt.toISOString() : event.publishedAt)
            : null,
    };
}
const ORGANIZER_PUBLIC_SELECT = {
    id: true,
    fullName: true,
    avatarUrl: true,
};
const TICKET_SELECT = {
    id: true,
    category: true,
    name: true,
    price: true,
    totalQuantity: true,
    availableQuantity: true,
    status: true,
};
const getEvents = async (query) => {
    const { page, limit, search, category, county, featured, startDate, endDate, sortBy, sortOrder } = query;
    const cacheKey = `events:list:${JSON.stringify(query)}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData)
        return cachedData;
    const categoryFilter = category
        ? category.includes(',')
            ? { in: category.split(',').map((c) => c.trim().toUpperCase()) }
            : category.toUpperCase()
        : undefined;
    const where = {
        isPublished: true,
        status: 'PUBLISHED',
        deletedAt: null,
        ...(search && {
            OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ],
        }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(county && { county: { equals: county, mode: 'insensitive' } }),
        ...(featured === 'true' && { isFeatured: true }),
        ...(startDate && { startTime: { gte: new Date(startDate) } }),
        ...(endDate && { startTime: { lte: new Date(endDate) } }),
    };
    const [totalItems, events, allCategories, allCounties] = await Promise.all([
        prisma_1.prisma.event.count({ where }),
        prisma_1.prisma.event.findMany({
            where,
            include: {
                organizer: { select: ORGANIZER_PUBLIC_SELECT },
                tickets: { select: TICKET_SELECT },
            },
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma_1.prisma.event.findMany({
            where: { isPublished: true, status: 'PUBLISHED', deletedAt: null },
            select: { category: true },
            distinct: ['category'],
        }),
        prisma_1.prisma.event.findMany({
            where: { isPublished: true, status: 'PUBLISHED', deletedAt: null, county: { not: null } },
            select: { county: true },
            distinct: ['county'],
        }),
    ]);
    const totalPages = Math.ceil(totalItems / limit);
    const result = {
        events: events.map(formatPublicEvent),
        pagination: {
            page,
            limit,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
        filters: {
            categories: allCategories.map((c) => c.category).filter(Boolean),
            counties: allCounties.map((c) => c.county).filter(Boolean),
        },
    };
    await setCache(cacheKey, result, 60);
    return result;
};
exports.getEvents = getEvents;
const getEventById = async (eventId) => {
    const cacheKey = `events:detail:${eventId}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData)
        return cachedData;
    const event = await prisma_1.prisma.event.findFirst({
        where: {
            id: eventId,
            isPublished: true,
            status: 'PUBLISHED',
            deletedAt: null,
        },
        include: {
            organizer: { select: ORGANIZER_PUBLIC_SELECT },
            tickets: { select: TICKET_SELECT },
        },
    });
    if (!event) {
        throw new Error('Event not found');
    }
    const location = (typeof event.location === 'object' && event.location !== null)
        ? event.location
        : {};
    const totalAvailable = event.tickets.reduce((sum, t) => sum + (t.availableQuantity || 0), 0);
    const result = {
        id: event.id,
        title: event.title,
        description: event.description || '',
        posterUrl: event.posterUrl || null,
        category: event.category || 'OTHER',
        venue: location.venue || '',
        location: location.address || '',
        county: event.county || '',
        startTime: event.startTime.toISOString(),
        endTime: event.endTime?.toISOString() || null,
        isFeatured: event.isFeatured,
        status: event.status,
        organizer: {
            id: event.organizer.id,
            name: event.organizer.fullName || '',
            avatarUrl: event.organizer.avatarUrl || null,
        },
        tickets: event.tickets.map(t => ({
            id: t.id,
            name: t.name,
            category: t.category,
            price: Number(t.price),
            totalQuantity: t.totalQuantity,
            availableQuantity: t.availableQuantity,
            available: t.availableQuantity,
            status: t.status,
        })),
        isSoldOut: totalAvailable === 0,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        publishedAt: event.publishedAt?.toISOString() || null,
    };
    await setCache(cacheKey, result, 60);
    return result;
};
exports.getEventById = getEventById;
const updateEvent = async (eventId, userId, userRole, data, posterFile, trailerFile) => {
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { organizerId: true, isPublished: true },
    });
    if (!event) {
        throw new Error('Event not found');
    }
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
        throw new Error('Unauthorized: You can only update your own events');
    }
    const { tickets: _tickets, posterUrl: _posterUrl, ...restData } = data;
    let posterUrl;
    let videoUrl;
    if (posterFile)
        posterUrl = await (0, cloudinary_1.uploadEventPoster)(posterFile);
    if (trailerFile)
        videoUrl = await (0, cloudinary_1.uploadEventTrailer)(trailerFile);
    const updated = await prisma_1.prisma.event.update({
        where: { id: eventId },
        data: {
            ...restData,
            ...(posterUrl && { posterUrl }),
            ...(videoUrl && { videoUrl }),
        },
    });
    if (event.isPublished) {
        await invalidateEventsListCache();
        await redis_1.redis.del(`events:detail:${eventId}`);
    }
    return updated;
};
exports.updateEvent = updateEvent;
const deleteEvent = async (eventId, userId, userRole) => {
    const event = await prisma_1.prisma.event.findFirst({
        where: { id: eventId, deletedAt: null },
        select: { organizerId: true },
    });
    if (!event) {
        throw new Error('Event not found');
    }
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
        throw new Error('Unauthorized: You can only delete your own events');
    }
    await prisma_1.prisma.event.update({
        where: { id: eventId },
        data: { deletedAt: new Date() },
    });
    await invalidateEventsListCache();
    await redis_1.redis.del(`events:detail:${eventId}`);
    return { message: 'Event deleted successfully' };
};
exports.deleteEvent = deleteEvent;
const postponeEvent = async (eventId, userId, userRole, newStartTime, newEndTime, reason) => {
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        include: {
            organizer: {
                select: { fullName: true, email: true },
            },
        },
    });
    if (!event) {
        throw new Error('Event not found');
    }
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
        throw new Error('Unauthorized: You can only postpone your own events');
    }
    const originalStartTime = event.originalStartTime || event.startTime;
    const updatedEvent = await prisma_1.prisma.event.update({
        where: { id: eventId },
        data: {
            startTime: newStartTime,
            endTime: newEndTime,
            originalStartTime,
            status: 'POSTPONED',
            postponementReason: reason,
            postponedAt: new Date(),
        },
    });
    await (0, notification_service_1.notifyAdmins)('EVENT_POSTPONED', `Event Postponed: ${event.title}`, `The event "${event.title}" has been postponed by organizer ${event.organizer.fullName}. Reason: ${reason}`, {
        eventId,
        eventTitle: event.title,
        organizerName: event.organizer.fullName,
        organizerEmail: event.organizer.email,
        oldStartTime: event.startTime.toISOString(),
        newStartTime: newStartTime.toISOString(),
        reason,
    });
    const formattedOldDate = event.startTime.toLocaleDateString('en-KE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
    const formattedNewDate = newStartTime.toLocaleDateString('en-KE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
    const { notifiedCount } = await (0, notification_service_1.notifyEventAttendees)(eventId, 'EVENT_POSTPONED', `Event Postponed: ${event.title}`, `We regret to inform you that "${event.title}" has been postponed.\n\nOriginal Date: ${formattedOldDate}\nNew Date: ${formattedNewDate}\n\nReason: ${reason}\n\nYour tickets remain valid for the new date.`, {
        eventId,
        eventTitle: event.title,
        oldStartTime: event.startTime.toISOString(),
        newStartTime: newStartTime.toISOString(),
        reason,
    }, true);
    await (0, audit_1.logAudit)('EVENT_POSTPONED', 'Event', eventId, userId, {
        oldStartTime: event.startTime.toISOString(),
        newStartTime: newStartTime.toISOString(),
        reason,
        attendeesNotified: notifiedCount,
    });
    if (event.isPublished) {
        await invalidateEventsListCache();
        await redis_1.redis.del(`events:detail:${eventId}`);
    }
    return {
        event: updatedEvent,
        attendeesNotified: notifiedCount,
        message: 'Event postponed successfully. All ticket holders have been notified.',
    };
};
exports.postponeEvent = postponeEvent;
const cancelEvent = async (eventId, userId, userRole, reason) => {
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        include: {
            organizer: {
                select: { fullName: true, email: true },
            },
        },
    });
    if (!event) {
        throw new Error('Event not found');
    }
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
        throw new Error('Unauthorized: You can only cancel your own events');
    }
    const updatedEvent = await prisma_1.prisma.event.update({
        where: { id: eventId },
        data: {
            status: 'CANCELLED',
            isPublished: false,
        },
    });
    await invalidateEventsListCache();
    await redis_1.redis.del(`events:detail:${eventId}`);
    await (0, notification_service_1.notifyAdmins)('EVENT_CANCELLED', `Event Cancelled: ${event.title}`, `The event "${event.title}" has been cancelled by organizer ${event.organizer.fullName}. Reason: ${reason}`, {
        eventId,
        eventTitle: event.title,
        organizerName: event.organizer.fullName,
        organizerEmail: event.organizer.email,
        reason,
    });
    const { notifiedCount } = await (0, notification_service_1.notifyEventAttendees)(eventId, 'EVENT_CANCELLED', `Event Cancelled: ${event.title}`, `We regret to inform you that "${event.title}" has been cancelled.\n\nReason: ${reason}\n\nRefund processing will begin shortly. You will receive an email with refund details.`, { eventId, eventTitle: event.title, reason }, true);
    await (0, audit_1.logAudit)('EVENT_CANCELLED', 'Event', eventId, userId, {
        reason,
        attendeesNotified: notifiedCount,
    });
    await (0, alerts_service_1.createSystemAlert)('event', 'high', `Event Cancelled: ${event.title}`, `Event "${event.title}" was cancelled. Reason: ${reason}. ${notifiedCount} attendees notified.`, { eventId, organizerName: event.organizer.fullName, reason, attendeesNotified: notifiedCount });
    return {
        event: updatedEvent,
        attendeesNotified: notifiedCount,
        message: 'Event cancelled. All ticket holders have been notified and refunds will be processed.',
    };
};
exports.cancelEvent = cancelEvent;
const publishEvent = async (eventId, userId, userRole) => {
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        include: { tickets: true },
    });
    if (!event) {
        throw new Error('Event not found');
    }
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
        throw new Error('Unauthorized: You can only publish your own events');
    }
    const errors = [];
    if (!event.posterUrl) {
        errors.push('Event poster is required before publishing');
    }
    if (!event.title) {
        errors.push('Event title is required');
    }
    if (!event.description) {
        errors.push('Event description is required');
    }
    if (!event.county) {
        errors.push('County is required');
    }
    if (event.tickets.length === 0) {
        errors.push('At least one ticket category must be created before publishing');
    }
    if (event.startTime < new Date()) {
        errors.push('Event start time must be in the future');
    }
    if (errors.length > 0) {
        const err = new Error(errors[0]);
        err.statusCode = 400;
        err.validationErrors = errors;
        throw err;
    }
    const published = await prisma_1.prisma.event.update({
        where: { id: eventId },
        data: {
            isPublished: true,
            status: 'PUBLISHED',
            publishedAt: new Date(),
        },
    });
    await invalidateEventsListCache();
    await redis_1.redis.del(`events:detail:${eventId}`);
    return published;
};
exports.publishEvent = publishEvent;
const getOrganizerEvents = async (organizerId, options) => {
    const { status, limit = 50, offset = 0 } = options || {};
    return prisma_1.prisma.event.findMany({
        where: {
            organizerId,
            deletedAt: null,
            ...(status && { status: status }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
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
            _count: {
                select: { orders: true },
            },
        },
    });
};
exports.getOrganizerEvents = getOrganizerEvents;
const getFeaturedEvents = async (limit = 10) => {
    const cacheKey = `events:featured:${limit}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData)
        return cachedData;
    const events = await prisma_1.prisma.event.findMany({
        where: {
            isFeatured: true,
            status: 'PUBLISHED',
            isPublished: true,
            deletedAt: null,
            startTime: { gt: new Date() },
        },
        take: limit,
        orderBy: { featuredAt: 'desc' },
        include: {
            organizer: { select: ORGANIZER_PUBLIC_SELECT },
            tickets: { select: TICKET_SELECT },
        },
    });
    const result = events.map(formatPublicEvent);
    await setCache(cacheKey, result, 300);
    return result;
};
exports.getFeaturedEvents = getFeaturedEvents;
const getEventAttendees = async (eventId, userId, userRole, page = 1, limit = 20) => {
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { organizerId: true, title: true },
    });
    if (!event) {
        throw new Error('Event not found');
    }
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
        throw new Error('Unauthorized: You can only view attendees of your own events');
    }
    const skip = (page - 1) * limit;
    const [attendees, total] = await Promise.all([
        prisma_1.prisma.ticketPurchase.findMany({
            where: { eventId, status: 'ACTIVE' },
            skip,
            take: limit,
            orderBy: { purchasedAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phoneNumber: true,
                        avatarUrl: true,
                    },
                },
                ticket: {
                    select: {
                        id: true,
                        name: true,
                        category: true,
                        price: true,
                    },
                },
            },
        }),
        prisma_1.prisma.ticketPurchase.count({
            where: { eventId, status: 'ACTIVE' },
        }),
    ]);
    return {
        attendees,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.getEventAttendees = getEventAttendees;
//# sourceMappingURL=events.service.js.map