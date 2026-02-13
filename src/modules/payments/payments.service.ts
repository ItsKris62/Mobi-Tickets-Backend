import { prisma } from '../../lib/prisma';
import { logAudit } from '../../lib/audit';
import { createNotification } from '../notifications/notification.service';

// Initiate a payment for an order
export const initiatePayment = async (
  orderId: string,
  userId: string,
  method: 'MPESA' | 'CARD' | 'CRYPTO',
  phoneNumber?: string
) => {
  const order = await prisma.order.findUnique({
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

  // Check if a transaction already exists
  if (order.transaction && order.transaction.status !== 'FAILED') {
    throw new Error('A payment is already in progress for this order');
  }

  // Create or update transaction
  const transaction = await prisma.transaction.upsert({
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

  // For M-Pesa: would initiate STK push here
  // For now, return transaction reference for the frontend to track
  if (method === 'MPESA') {
    if (!phoneNumber) {
      throw new Error('Phone number is required for M-Pesa payments');
    }
    // TODO: Integrate with Safaricom Daraja API for STK Push
    // const stkResult = await initiateStkPush(phoneNumber, order.totalAmount, transaction.id);
    await logAudit('MPESA_STK_INITIATED', 'Transaction', transaction.id, userId, {
      orderId,
      amount: order.totalAmount,
      phoneNumber: '***' + phoneNumber.slice(-4),
    });
  }

  await logAudit('PAYMENT_INITIATED', 'Transaction', transaction.id, userId, {
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

// Handle M-Pesa callback
export const handleMpesaCallback = async (callbackData: {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: { Item: Array<{ Name: string; Value?: string | number }> };
}) => {
  const { ResultCode, CheckoutRequestID, CallbackMetadata } = callbackData;

  // Find the transaction by gateway reference
  const transaction = await prisma.transaction.findFirst({
    where: { gatewayTxId: CheckoutRequestID },
    include: { order: true },
  });

  if (!transaction) {
    // Log for debugging but don't throw — M-Pesa may retry
    console.error('M-Pesa callback: Transaction not found for', CheckoutRequestID);
    return { message: 'Callback received' };
  }

  if (ResultCode === 0) {
    // Payment successful
    let mpesaReceiptNumber: string | undefined;
    if (CallbackMetadata) {
      const receipt = CallbackMetadata.Item.find((i) => i.Name === 'MpesaReceiptNumber');
      mpesaReceiptNumber = receipt?.Value?.toString();
    }

    await prisma.$transaction(async (tx) => {
      // Update transaction
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED',
          gatewayTxId: mpesaReceiptNumber || CheckoutRequestID,
        },
      });

      // Update order status
      await tx.order.update({
        where: { id: transaction.orderId },
        data: { status: 'PAID' },
      });
    });

    // Notify user
    await createNotification({
      userId: transaction.order.userId,
      eventId: transaction.order.eventId,
      type: 'TICKET_PURCHASE',
      title: 'Payment Successful',
      message: `Your payment of KES ${transaction.amount} has been received.`,
      data: { transactionId: transaction.id, orderId: transaction.orderId },
    });

    await logAudit('PAYMENT_COMPLETED', 'Transaction', transaction.id, transaction.order.userId, {
      method: 'MPESA',
      amount: transaction.amount,
      mpesaReceiptNumber,
    });
  } else {
    // Payment failed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'FAILED' },
    });

    await logAudit('PAYMENT_FAILED', 'Transaction', transaction.id, transaction.order.userId, {
      resultCode: ResultCode,
      resultDesc: callbackData.ResultDesc,
    });
  }

  return { message: 'Callback processed' };
};

// Get payment status
export const getPaymentStatus = async (transactionId: string, userId: string) => {
  const transaction = await prisma.transaction.findUnique({
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
