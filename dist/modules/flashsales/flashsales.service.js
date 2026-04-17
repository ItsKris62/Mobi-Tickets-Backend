"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerFlashSaleNotification = exports.redeemFlashSale = exports.validatePromoCode = exports.deleteFlashSale = exports.updateFlashSale = exports.getActiveFlashSales = exports.getEventFlashSales = exports.createFlashSale = void 0;
const prisma_1 = require("../../lib/prisma");
const notification_service_1 = require("../notifications/notification.service");
const createFlashSale = async (data, organizerId) => {
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: data.eventId },
        select: { organizerId: true, title: true },
    });
    if (!event) {
        throw new Error('Event not found');
    }
    if (event.organizerId !== organizerId) {
        throw new Error('Unauthorized: You can only create flash sales for your own events');
    }
    if (data.startTime >= data.endTime) {
        throw new Error('End time must be after start time');
    }
    if (data.promoCode) {
        const existingPromo = await prisma_1.prisma.flashSale.findUnique({
            where: { promoCode: data.promoCode },
        });
        if (existingPromo) {
            throw new Error('Promo code already exists');
        }
    }
    const flashSale = await prisma_1.prisma.flashSale.create({
        data: {
            eventId: data.eventId,
            name: data.name,
            description: data.description,
            discountPercent: data.discountPercent,
            discountAmount: data.discountAmount,
            startTime: data.startTime,
            endTime: data.endTime,
            maxRedemptions: data.maxRedemptions,
            promoCode: data.promoCode,
            ticketCategories: data.ticketCategories || [],
            isActive: true,
        },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                },
            },
        },
    });
    return flashSale;
};
exports.createFlashSale = createFlashSale;
const getEventFlashSales = async (eventId, organizerId, userRole) => {
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { organizerId: true },
    });
    if (!event) {
        throw new Error('Event not found');
    }
    if (event.organizerId !== organizerId && userRole !== 'ADMIN') {
        throw new Error('Unauthorized');
    }
    return prisma_1.prisma.flashSale.findMany({
        where: { eventId },
        orderBy: { startTime: 'desc' },
    });
};
exports.getEventFlashSales = getEventFlashSales;
const getActiveFlashSales = async (eventId) => {
    const now = new Date();
    const flashSales = await prisma_1.prisma.flashSale.findMany({
        where: {
            eventId,
            isActive: true,
            startTime: { lte: now },
            endTime: { gte: now },
        },
        select: {
            id: true,
            name: true,
            description: true,
            discountPercent: true,
            discountAmount: true,
            startTime: true,
            endTime: true,
            ticketCategories: true,
            promoCode: true,
            maxRedemptions: true,
            currentRedemptions: true,
        },
    });
    return flashSales.filter((fs) => {
        if (fs.maxRedemptions === null)
            return true;
        return fs.currentRedemptions < fs.maxRedemptions;
    });
};
exports.getActiveFlashSales = getActiveFlashSales;
const updateFlashSale = async (flashSaleId, data, organizerId, userRole) => {
    const flashSale = await prisma_1.prisma.flashSale.findUnique({
        where: { id: flashSaleId },
        include: {
            event: {
                select: { organizerId: true },
            },
        },
    });
    if (!flashSale) {
        throw new Error('Flash sale not found');
    }
    if (flashSale.event.organizerId !== organizerId && userRole !== 'ADMIN') {
        throw new Error('Unauthorized');
    }
    return prisma_1.prisma.flashSale.update({
        where: { id: flashSaleId },
        data,
    });
};
exports.updateFlashSale = updateFlashSale;
const deleteFlashSale = async (flashSaleId, organizerId, userRole) => {
    const flashSale = await prisma_1.prisma.flashSale.findUnique({
        where: { id: flashSaleId },
        include: {
            event: {
                select: { organizerId: true },
            },
        },
    });
    if (!flashSale) {
        throw new Error('Flash sale not found');
    }
    if (flashSale.event.organizerId !== organizerId && userRole !== 'ADMIN') {
        throw new Error('Unauthorized');
    }
    await prisma_1.prisma.flashSale.delete({
        where: { id: flashSaleId },
    });
    return { message: 'Flash sale deleted successfully' };
};
exports.deleteFlashSale = deleteFlashSale;
const validatePromoCode = async (eventId, promoCode, ticketCategory) => {
    const now = new Date();
    const flashSale = await prisma_1.prisma.flashSale.findFirst({
        where: {
            eventId,
            promoCode,
            isActive: true,
            startTime: { lte: now },
            endTime: { gte: now },
        },
    });
    if (!flashSale) {
        throw new Error('Invalid or expired promo code');
    }
    if (flashSale.maxRedemptions && flashSale.currentRedemptions >= flashSale.maxRedemptions) {
        throw new Error('Promo code has reached its maximum usage limit');
    }
    const categories = flashSale.ticketCategories || [];
    if (categories.length > 0 && !categories.includes(ticketCategory)) {
        throw new Error('This promo code does not apply to the selected ticket category');
    }
    return {
        flashSaleId: flashSale.id,
        discountPercent: flashSale.discountPercent,
        discountAmount: flashSale.discountAmount,
        name: flashSale.name,
    };
};
exports.validatePromoCode = validatePromoCode;
const redeemFlashSale = async (flashSaleId) => {
    return prisma_1.prisma.flashSale.update({
        where: { id: flashSaleId },
        data: {
            currentRedemptions: { increment: 1 },
        },
    });
};
exports.redeemFlashSale = redeemFlashSale;
const triggerFlashSaleNotification = async (flashSaleId, organizerId) => {
    const flashSale = await prisma_1.prisma.flashSale.findUnique({
        where: { id: flashSaleId },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    organizerId: true,
                },
            },
        },
    });
    if (!flashSale) {
        throw new Error('Flash sale not found');
    }
    if (flashSale.event.organizerId !== organizerId) {
        throw new Error('Unauthorized');
    }
    const endTime = flashSale.endTime.toLocaleDateString('en-KE', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    const { notifiedCount } = await (0, notification_service_1.notifyEventAttendees)(flashSale.eventId, 'FLASH_SALE', `🔥 Flash Sale: ${flashSale.name}`, `Save ${flashSale.discountPercent}% on tickets for "${flashSale.event.title}"! Offer ends ${endTime}.${flashSale.promoCode ? ` Use code: ${flashSale.promoCode}` : ''}`, {
        flashSaleId: flashSale.id,
        eventId: flashSale.eventId,
        eventTitle: flashSale.event.title,
        discountPercent: flashSale.discountPercent,
        promoCode: flashSale.promoCode,
        endTime: flashSale.endTime.toISOString(),
    }, true);
    return { notifiedCount };
};
exports.triggerFlashSaleNotification = triggerFlashSaleNotification;
//# sourceMappingURL=flashsales.service.js.map