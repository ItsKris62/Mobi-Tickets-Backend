"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTicket = exports.transferTicket = exports.requestRefund = exports.getTicketQR = exports.getUserTickets = exports.purchaseTickets = void 0;
const tslib_1 = require("tslib");
const prisma_1 = require("../../lib/prisma");
const audit_1 = require("../../lib/audit");
const notification_service_1 = require("../notifications/notification.service");
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const qr_code_1 = require("../../utils/qr-code");
const analytics_1 = require("../../utils/analytics");
const analytics_service_1 = require("./analytics.service");
function generateTicketNumber(eventDate) {
    const dateStr = new Date(eventDate).toISOString().slice(0, 10).replace(/-/g, '');
    const random = crypto_1.default.randomBytes(3).toString('hex').toUpperCase().substring(0, 4);
    return `MBT-${dateStr}-${random}`;
}
const purchaseTickets = async (userId, ticketId, quantity) => {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
        try {
            return await prisma_1.prisma.$transaction(async (tx) => {
                const ticket = await tx.ticket.findUnique({
                    where: { id: ticketId },
                    select: {
                        availableQuantity: true,
                        price: true,
                        name: true,
                        eventId: true,
                        event: { select: { title: true, startTime: true } }
                    },
                });
                if (!ticket || ticket.availableQuantity < quantity) {
                    throw new Error('Insufficient tickets available');
                }
                await tx.ticket.update({
                    where: { id: ticketId },
                    data: { availableQuantity: { decrement: quantity } },
                });
                const totalAmount = ticket.price * quantity;
                const order = await tx.order.create({
                    data: {
                        userId,
                        eventId: ticket.eventId,
                        totalAmount,
                        status: 'PAID',
                    },
                });
                await tx.orderItem.create({
                    data: {
                        orderId: order.id,
                        ticketId,
                        quantity,
                        priceAtTime: ticket.price,
                    },
                });
                const createdPurchases = [];
                for (let i = 0; i < quantity; i++) {
                    const purchase = await tx.ticketPurchase.create({
                        data: {
                            userId,
                            orderId: order.id,
                            ticketId,
                            eventId: ticket.eventId,
                            status: 'ACTIVE',
                            ticketNumber: generateTicketNumber(ticket.event.startTime),
                            qrCodeData: crypto_1.default.randomUUID(),
                        }
                    });
                    createdPurchases.push(purchase);
                }
                const finalPurchases = [];
                for (const purchase of createdPurchases) {
                    const qrPayload = {
                        ticketId: purchase.id,
                        ticketNumber: purchase.ticketNumber,
                        eventId: purchase.eventId,
                        userId: purchase.userId,
                        ticketType: ticket.name,
                        timestamp: Date.now()
                    };
                    const qrCodeData = (0, qr_code_1.generateQRCodeData)(qrPayload);
                    const updatedPurchase = await tx.ticketPurchase.update({
                        where: { id: purchase.id },
                        data: { qrCodeData }
                    });
                    finalPurchases.push(updatedPurchase);
                }
                const user = await tx.user.findUnique({
                    where: { id: userId },
                    select: { email: true, fullName: true },
                });
                try {
                    await (0, notification_service_1.createNotification)({
                        userId,
                        eventId: ticket.eventId,
                        type: 'TICKET_PURCHASE',
                        title: '🎫 Ticket Purchase Confirmed',
                        message: `You purchased ${quantity} ticket(s) for "${ticket.event.title}". Order ID: ${order.id}`,
                        data: { orderId: order.id, ticketId, quantity },
                    });
                }
                catch {
                }
                await (0, audit_1.logAudit)('TICKET_PURCHASED', 'Order', order.id, userId, { ticketId, quantity });
                return { order, qrCode: finalPurchases[0]?.qrCodeData };
            });
        }
        catch (error) {
            if (error.code === 'P2002' && (error.meta?.target?.includes('ticketNumber') || error.meta?.target === 'ticketNumber')) {
                attempts++;
                console.warn(`[purchaseTickets] Ticket number collision detected. Retrying... (Attempt ${attempts} of ${maxAttempts})`);
                if (attempts >= maxAttempts)
                    throw new Error('High booking volume. Please try again later.');
                continue;
            }
            throw error;
        }
    }
    try {
        const ticketInfo = await prisma_1.prisma.ticket.findUnique({
            where: { id: ticketId },
            select: { eventId: true, event: { select: { organizerId: true } } }
        });
        if (ticketInfo) {
            await (0, analytics_1.computeEventAnalytics)(ticketInfo.eventId);
            await (0, analytics_service_1.invalidateOrganizerAnalyticsCache)(ticketInfo.event.organizerId);
        }
    }
    catch (analyticsError) {
        console.error(`[Analytics] Failed to update analytics for event after purchase:`, analyticsError);
    }
};
exports.purchaseTickets = purchaseTickets;
const getUserTickets = async (userId) => {
    const orders = await prisma_1.prisma.order.findMany({
        where: { userId },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    startTime: true,
                    endTime: true,
                    location: true,
                    posterUrl: true,
                },
            },
            items: {
                include: {
                    ticket: {
                        select: {
                            id: true,
                            category: true,
                            name: true,
                            price: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    return orders;
};
exports.getUserTickets = getUserTickets;
const getTicketQR = async (orderId, userId) => {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true },
    });
    if (!order) {
        throw new Error('Order not found');
    }
    if (order.userId !== userId) {
        throw new Error('Unauthorized: This is not your ticket');
    }
    const orderItems = await prisma_1.prisma.orderItem.findMany({
        where: { orderId },
        select: { ticketId: true },
    });
    if (orderItems.length === 0) {
        throw new Error('No tickets found for this order');
    }
    const qrCode = await generateTicketQR(orderItems[0].ticketId, orderId);
    return { qrCode, orderId };
};
exports.getTicketQR = getTicketQR;
const requestRefund = async (orderId, userId, reason) => {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
    });
    if (!order) {
        throw new Error('Order not found');
    }
    if (order.userId !== userId) {
        throw new Error('Unauthorized: This is not your order');
    }
    if (order.status !== 'PAID') {
        throw new Error('Only paid orders can be refunded');
    }
    const existing = await prisma_1.prisma.refundRequest.findFirst({
        where: { orderId, status: 'PENDING' },
    });
    if (existing) {
        throw new Error('A refund request for this order is already pending');
    }
    const refundRequest = await prisma_1.prisma.refundRequest.create({
        data: {
            orderId,
            userId,
            reason,
            amount: order.totalAmount,
        },
    });
    await (0, audit_1.logAudit)('REFUND_REQUESTED', 'Order', orderId, userId, {
        amount: order.totalAmount,
        reason,
    });
    return {
        message: 'Refund request submitted successfully',
        refundRequestId: refundRequest.id,
    };
};
exports.requestRefund = requestRefund;
const transferTicket = async (ticketPurchaseId, userId, recipientEmail) => {
    const ticketPurchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: { id: ticketPurchaseId },
        include: {
            event: { select: { title: true } },
            ticket: { select: { name: true } },
        },
    });
    if (!ticketPurchase) {
        throw new Error('Ticket not found');
    }
    if (ticketPurchase.userId !== userId) {
        throw new Error('Unauthorized: This is not your ticket');
    }
    if (ticketPurchase.status !== 'ACTIVE') {
        throw new Error('Only active tickets can be transferred');
    }
    const recipient = await prisma_1.prisma.user.findUnique({
        where: { email: recipientEmail },
        select: { id: true, email: true, fullName: true },
    });
    if (!recipient) {
        throw new Error('Recipient user not found. They must have a MobiTickets account.');
    }
    if (recipient.id === userId) {
        throw new Error('Cannot transfer ticket to yourself');
    }
    await prisma_1.prisma.ticketPurchase.update({
        where: { id: ticketPurchaseId },
        data: { userId: recipient.id },
    });
    await (0, audit_1.logAudit)('TICKET_TRANSFERRED', 'TicketPurchase', ticketPurchaseId, userId, {
        recipientId: recipient.id,
        recipientEmail,
        eventTitle: ticketPurchase.event.title,
    });
    return {
        message: `Ticket transferred to ${recipientEmail}`,
        recipientId: recipient.id,
    };
};
exports.transferTicket = transferTicket;
const validateTicket = async (qrData) => {
    const payload = (0, qr_code_1.verifyQRCodeData)(qrData);
    if (!payload) {
        return { valid: false, message: 'Invalid or tampered QR code.' };
    }
    const { ticketId, eventId, ticketType } = payload;
    const ticketPurchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: { id: ticketId },
        include: {
            user: { select: { fullName: true } },
            event: { select: { title: true, organizerId: true } },
        }
    });
    if (!ticketPurchase) {
        return { valid: false, message: 'Ticket not found. Invalid QR code.' };
    }
    if (ticketPurchase.eventId !== eventId) {
        return { valid: false, message: 'Ticket is for a different event.' };
    }
    if (ticketPurchase.status === 'USED') {
        return {
            valid: false,
            message: `Ticket already used at ${new Date(ticketPurchase.checkedInAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`,
            ticket: {
                ticketNumber: ticketPurchase.ticketNumber,
                attendeeName: ticketPurchase.user.fullName,
                ticketType,
                eventTitle: ticketPurchase.event.title,
                status: ticketPurchase.status,
                checkedInAt: ticketPurchase.checkedInAt,
            }
        };
    }
    if (ticketPurchase.status !== 'ACTIVE') {
        return { valid: false, message: `Ticket is not active. Status: ${ticketPurchase.status}` };
    }
    const now = new Date();
    const updatedTicket = await prisma_1.prisma.ticketPurchase.update({
        where: { id: ticketId },
        data: { status: 'USED', checkedInAt: now },
    });
    await (0, audit_1.logAudit)('TICKET_VALIDATED', 'TicketPurchase', ticketId, null, { eventId });
    try {
        await (0, analytics_1.computeEventAnalytics)(eventId);
        await (0, analytics_service_1.invalidateOrganizerAnalyticsCache)(ticketPurchase.event.organizerId);
    }
    catch (analyticsError) {
        console.error(`[Analytics] Failed to update analytics for event ${eventId} after check-in:`, analyticsError);
    }
    return {
        valid: true,
        message: 'Check-in successful!',
        ticket: {
            ticketNumber: updatedTicket.ticketNumber,
            attendeeName: ticketPurchase.user.fullName,
            ticketType,
            eventTitle: ticketPurchase.event.title,
            status: updatedTicket.status,
            checkedInAt: updatedTicket.checkedInAt,
        }
    };
};
exports.validateTicket = validateTicket;
//# sourceMappingURL=tickets.service.js.map