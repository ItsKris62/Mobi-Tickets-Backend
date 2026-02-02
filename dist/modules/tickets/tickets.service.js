"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTicketQR = exports.getTicketQR = exports.getUserTickets = exports.purchaseTickets = void 0;
const tslib_1 = require("tslib");
const prisma_1 = require("../../lib/prisma");
const QRCode = tslib_1.__importStar(require("qrcode"));
const audit_1 = require("../../lib/audit");
const queue_1 = require("../../lib/queue");
const purchaseTickets = async (userId, ticketId, quantity) => {
    return prisma_1.prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.findUnique({
            where: { id: ticketId },
            select: { availableQuantity: true, price: true, eventId: true },
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
                status: 'PENDING',
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
        const qrCode = await (0, exports.generateTicketQR)(ticketId, order.id);
        const user = await tx.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        if (user) {
            await queue_1.emailQueue.add('send-confirmation', {
                to: user.email,
                subject: 'MobiTickets Purchase Confirmation',
                text: `Order ${order.id} confirmed! QR: ${qrCode}`,
                orderId: order.id,
            });
        }
        await queue_1.nftQueue.add('mint-nft', {
            ticketId,
            userAddress: '0x...',
        });
        await (0, audit_1.logAudit)('TICKET_PURCHASED', 'Order', order.id, userId, { ticketId, quantity });
        return { order, qrCode };
    });
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
            orderItems: {
                include: {
                    ticket: {
                        select: {
                            type: true,
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
    const qrCode = await (0, exports.generateTicketQR)(orderItems[0].ticketId, orderId);
    return { qrCode, orderId };
};
exports.getTicketQR = getTicketQR;
const generateTicketQR = async (ticketId, orderId) => {
    const payload = {
        ticketId,
        orderId,
        timestamp: new Date().toISOString(),
    };
    const qrData = JSON.stringify(payload);
    const qrUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        margin: 2,
        scale: 10,
        color: { dark: '#000000', light: '#ffffff' },
    });
    await (0, audit_1.logAudit)('QR_GENERATED', 'Ticket', ticketId, null, { orderId });
    return qrUrl;
};
exports.generateTicketQR = generateTicketQR;
//# sourceMappingURL=tickets.service.js.map