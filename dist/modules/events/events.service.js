"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEvent = exports.updateEvent = exports.getEventById = exports.getEvents = exports.createEvent = void 0;
const prisma_1 = require("../../lib/prisma");
const cloudinary_1 = require("../../lib/cloudinary");
const createEvent = async (data, organizerId, posterFile, trailerFile) => {
    let posterUrl;
    let videoUrl;
    if (posterFile)
        posterUrl = await (0, cloudinary_1.uploadEventPoster)(posterFile);
    if (trailerFile)
        videoUrl = await (0, cloudinary_1.uploadEventTrailer)(trailerFile);
    return prisma_1.prisma.event.create({
        data: {
            ...data,
            organizerId,
            posterUrl,
            videoUrl,
            isPublished: false,
        },
    });
};
exports.createEvent = createEvent;
const getEvents = async (query) => {
    return prisma_1.prisma.event.findMany({
        where: query.upcoming ? { startTime: { gt: new Date() }, isPublished: true } : undefined,
        orderBy: { startTime: 'asc' },
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
                    type: true,
                    price: true,
                    availableQuantity: true,
                    status: true,
                },
            },
        },
    });
};
exports.getEvents = getEvents;
const getEventById = async (eventId) => {
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
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
                    type: true,
                    price: true,
                    totalQuantity: true,
                    availableQuantity: true,
                    status: true,
                },
            },
        },
    });
    if (!event) {
        throw new Error('Event not found');
    }
    return event;
};
exports.getEventById = getEventById;
const updateEvent = async (eventId, userId, userRole, data, posterFile, trailerFile) => {
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { organizerId: true },
    });
    if (!event) {
        throw new Error('Event not found');
    }
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
        throw new Error('Unauthorized: You can only update your own events');
    }
    let posterUrl;
    let videoUrl;
    if (posterFile)
        posterUrl = await (0, cloudinary_1.uploadEventPoster)(posterFile);
    if (trailerFile)
        videoUrl = await (0, cloudinary_1.uploadEventTrailer)(trailerFile);
    return prisma_1.prisma.event.update({
        where: { id: eventId },
        data: {
            ...data,
            ...(posterUrl && { posterUrl }),
            ...(videoUrl && { videoUrl }),
        },
    });
};
exports.updateEvent = updateEvent;
const deleteEvent = async (eventId, userId, userRole) => {
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { organizerId: true },
    });
    if (!event) {
        throw new Error('Event not found');
    }
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
        throw new Error('Unauthorized: You can only delete your own events');
    }
    await prisma_1.prisma.event.delete({
        where: { id: eventId },
    });
    return { message: 'Event deleted successfully' };
};
exports.deleteEvent = deleteEvent;
//# sourceMappingURL=events.service.js.map