"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentStatus = exports.confirmDummyPayment = exports.handleMpesaCallback = exports.initiatePayment = void 0;
const prisma_1 = require("../../lib/prisma");
const audit_1 = require("../../lib/audit");
const notification_service_1 = require("../notifications/notification.service");
const initiatePayment = async (orderId, userId, method, phoneNumber) => {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: orderId },
        include: { transaction: true },
    });
    if (!order) {
        throw new Error('Order not found');
    }
    if (order.userId !== userId) {
        throw new Error('Unauthorized: This is not your order');
    }
    if (order.status !== 'PENDING') {
        throw new Error(`Cannot initiate payment for order with status: ${order.status}`);
    }
    if (order.transaction && order.transaction.status !== 'FAILED') {
        throw new Error('A payment is already in progress for this order');
    }
    const transaction = await prisma_1.prisma.transaction.upsert({
        where: { orderId },
        update: {
            paymentMethod: method,
            status: 'PENDING',
            amount: order.totalAmount,
        },
        create: {
            orderId,
            amount: order.totalAmount,
            paymentMethod: method,
            status: 'PENDING',
        },
    });
    if (method === 'MPESA') {
        if (!phoneNumber) {
            throw new Error('Phone number is required for M-Pesa payments');
        }
        await (0, audit_1.logAudit)('MPESA_STK_INITIATED', 'Transaction', transaction.id, userId, {
            orderId,
            amount: order.totalAmount,
            phoneNumber: '***' + phoneNumber.slice(-4),
        });
    }
    await (0, audit_1.logAudit)('PAYMENT_INITIATED', 'Transaction', transaction.id, userId, {
        orderId,
        method,
        amount: order.totalAmount,
    });
    return {
        message: 'Payment initiated',
        transactionId: transaction.id,
        amount: order.totalAmount,
        method,
        status: 'PENDING',
    };
};
exports.initiatePayment = initiatePayment;
const handleMpesaCallback = async (callbackData) => {
    const { ResultCode, CheckoutRequestID, CallbackMetadata } = callbackData;
    const transaction = await prisma_1.prisma.transaction.findFirst({
        where: { gatewayTxId: CheckoutRequestID },
        include: { order: true },
    });
    if (!transaction) {
        console.error('M-Pesa callback: Transaction not found for', CheckoutRequestID);
        return { message: 'Callback received' };
    }
    if (ResultCode === 0) {
        let mpesaReceiptNumber;
        if (CallbackMetadata) {
            const receipt = CallbackMetadata.Item.find((i) => i.Name === 'MpesaReceiptNumber');
            mpesaReceiptNumber = receipt?.Value?.toString();
        }
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'COMPLETED',
                    gatewayTxId: mpesaReceiptNumber || CheckoutRequestID,
                },
            });
            await tx.order.update({
                where: { id: transaction.orderId },
                data: { status: 'PAID' },
            });
        });
        await (0, notification_service_1.createNotification)({
            userId: transaction.order.userId,
            eventId: transaction.order.eventId,
            type: 'TICKET_PURCHASE',
            title: 'Payment Successful',
            message: `Your payment of KES ${transaction.amount} has been received.`,
            data: { transactionId: transaction.id, orderId: transaction.orderId },
        });
        await (0, audit_1.logAudit)('PAYMENT_COMPLETED', 'Transaction', transaction.id, transaction.order.userId, {
            method: 'MPESA',
            amount: transaction.amount,
            mpesaReceiptNumber,
        });
    }
    else {
        await prisma_1.prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'FAILED' },
        });
        await (0, audit_1.logAudit)('PAYMENT_FAILED', 'Transaction', transaction.id, transaction.order.userId, {
            resultCode: ResultCode,
            resultDesc: callbackData.ResultDesc,
        });
    }
    return { message: 'Callback processed' };
};
exports.handleMpesaCallback = handleMpesaCallback;
const confirmDummyPayment = async (transactionId, userId) => {
    const transaction = await prisma_1.prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
            order: true,
        },
    });
    if (!transaction) {
        throw new Error('Transaction not found');
    }
    if (transaction.order.userId !== userId) {
        throw new Error('Unauthorized: This is not your transaction');
    }
    if (transaction.status === 'COMPLETED') {
        throw new Error('Payment already completed');
    }
    if (transaction.order.status !== 'PENDING') {
        throw new Error(`Cannot confirm payment for order with status: ${transaction.order.status}`);
    }
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.transaction.update({
            where: { id: transactionId },
            data: { status: 'COMPLETED' },
        });
        await tx.order.update({
            where: { id: transaction.orderId },
            data: { status: 'PAID' },
        });
    });
    await (0, notification_service_1.createNotification)({
        userId,
        eventId: transaction.order.eventId,
        type: 'TICKET_PURCHASE',
        title: 'Payment Confirmed',
        message: `Your payment of KES ${transaction.amount.toLocaleString()} has been confirmed. Order #${transaction.orderId.slice(0, 8).toUpperCase()}`,
        data: { transactionId, orderId: transaction.orderId },
    });
    await (0, audit_1.logAudit)('PAYMENT_COMPLETED', 'Transaction', transactionId, userId, {
        method: 'DUMMY',
        amount: transaction.amount,
        orderId: transaction.orderId,
    });
    return {
        success: true,
        transactionId,
        orderId: transaction.orderId,
        amount: transaction.amount,
    };
};
exports.confirmDummyPayment = confirmDummyPayment;
const getPaymentStatus = async (transactionId, userId) => {
    const transaction = await prisma_1.prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
            order: {
                select: { userId: true, totalAmount: true, status: true },
            },
        },
    });
    if (!transaction) {
        throw new Error('Transaction not found');
    }
    if (transaction.order.userId !== userId) {
        throw new Error('Unauthorized: This is not your transaction');
    }
    return {
        transactionId: transaction.id,
        orderId: transaction.orderId,
        amount: transaction.amount,
        method: transaction.paymentMethod,
        status: transaction.status,
        orderStatus: transaction.order.status,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
    };
};
exports.getPaymentStatus = getPaymentStatus;
//# sourceMappingURL=payments.service.js.map