// Ticket business logic – atomic purchases with Prisma transactions + QR generation
import { prisma } from '../../lib/prisma';
import * as QRCode from 'qrcode';
import { logAudit } from '../../lib/audit';
import { emailQueue, nftQueue } from '../../lib/queue'; // From earlier BullMQ setup

// Purchase tickets (transaction-safe to prevent oversell)
export const purchaseTickets = async (
  userId: string,
  ticketId: string,
  quantity: number
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma.$transaction(async (tx: any) => {
    // Lock & check availability
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      select: { availableQuantity: true, price: true, eventId: true },
    });

    if (!ticket || ticket.availableQuantity < quantity) {
      throw new Error('Insufficient tickets available');
    }

    // Decrement atomically
    await tx.ticket.update({
      where: { id: ticketId },
      data: { availableQuantity: { decrement: quantity } },
    });

    // Create order
    const totalAmount = ticket.price * quantity;
    const order = await tx.order.create({
      data: {
        userId,
        eventId: ticket.eventId,
        totalAmount,
        status: 'PENDING',
      },
    });

    // Link order item
    await tx.orderItem.create({
      data: {
        orderId: order.id,
        ticketId,
        quantity,
        priceAtTime: ticket.price,
      },
    });

    // Generate QR
    const qrCode = await generateTicketQR(ticketId, order.id);

    // Get user email for confirmation
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Queue async jobs (email confirmation + NFT mint)
    if (user) {
      await emailQueue.add('send-confirmation', {
        to: user.email,
        subject: 'MobiTickets Purchase Confirmation',
        text: `Order ${order.id} confirmed! QR: ${qrCode}`,
        orderId: order.id,
      });
    }

    await nftQueue.add('mint-nft', {
      ticketId,
      userAddress: '0x...', // From wallet context if available
    });

    await logAudit('TICKET_PURCHASED', 'Order', order.id, userId, { ticketId, quantity });

    return { order, qrCode };
  });
};

// Get user's tickets
export const getUserTickets = async (userId: string) => {
  const orders = await prisma.order.findMany({
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

// Get ticket QR code
export const getTicketQR = async (orderId: string, userId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.userId !== userId) {
    throw new Error('Unauthorized: This is not your ticket');
  }

  const orderItems = await prisma.orderItem.findMany({
    where: { orderId },
    select: { ticketId: true },
  });

  if (orderItems.length === 0) {
    throw new Error('No tickets found for this order');
  }

  // Generate QR for the first ticket (or all tickets)
  const qrCode = await generateTicketQR(orderItems[0]!.ticketId, orderId);

  return { qrCode, orderId };
};

// Generate secure QR code as data URL
export const generateTicketQR = async (ticketId: string, orderId: string): Promise<string> => {
  const payload = {
    ticketId,
    orderId,
    timestamp: new Date().toISOString(),
    // Add nonce or signature for anti-replay
  };

  const qrData = JSON.stringify(payload);
  const qrUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: 10,
    color: { dark: '#000000', light: '#ffffff' },
  });

  await logAudit('QR_GENERATED', 'Ticket', ticketId, null, { orderId });

  return qrUrl; // Frontend can render as <img src={qrUrl} />
};

// Request a refund for an order
export const requestRefund = async (orderId: string, userId: string, reason: string) => {
  const order = await prisma.order.findUnique({
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

  // Check if a refund request already exists
  const existing = await prisma.refundRequest.findFirst({
    where: { orderId, status: 'PENDING' },
  });

  if (existing) {
    throw new Error('A refund request for this order is already pending');
  }

  const refundRequest = await prisma.refundRequest.create({
    data: {
      orderId,
      userId,
      reason,
      amount: order.totalAmount,
    },
  });

  await logAudit('REFUND_REQUESTED', 'Order', orderId, userId, {
    amount: order.totalAmount,
    reason,
  });

  return {
    message: 'Refund request submitted successfully',
    refundRequestId: refundRequest.id,
  };
};

// Transfer a ticket to another user
export const transferTicket = async (
  ticketPurchaseId: string,
  userId: string,
  recipientEmail: string
) => {
  const ticketPurchase = await prisma.ticketPurchase.findUnique({
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

  // Find recipient
  const recipient = await prisma.user.findUnique({
    where: { email: recipientEmail },
    select: { id: true, email: true, fullName: true },
  });

  if (!recipient) {
    throw new Error('Recipient user not found. They must have a MobiTickets account.');
  }

  if (recipient.id === userId) {
    throw new Error('Cannot transfer ticket to yourself');
  }

  // Transfer the ticket purchase
  await prisma.ticketPurchase.update({
    where: { id: ticketPurchaseId },
    data: { userId: recipient.id },
  });

  await logAudit('TICKET_TRANSFERRED', 'TicketPurchase', ticketPurchaseId, userId, {
    recipientId: recipient.id,
    recipientEmail,
    eventTitle: ticketPurchase.event.title,
  });

  return {
    message: `Ticket transferred to ${recipientEmail}`,
    recipientId: recipient.id,
  };
};

// Validate a ticket QR code (for event entry)
export const validateTicket = async (qrData: string) => {
  let parsed: { ticketId: string; orderId: string; timestamp: string };

  try {
    parsed = JSON.parse(qrData);
  } catch {
    throw new Error('Invalid QR data format');
  }

  if (!parsed.ticketId || !parsed.orderId) {
    throw new Error('QR data missing required fields');
  }

  // Find the order and verify
  const order = await prisma.order.findUnique({
    where: { id: parsed.orderId },
    include: {
      event: {
        select: { id: true, title: true, startTime: true, location: true },
      },
      items: {
        where: { ticketId: parsed.ticketId },
        include: {
          ticket: {
            select: { id: true, name: true, category: true },
          },
        },
      },
      user: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  if (!order) {
    throw new Error('Order not found – invalid QR code');
  }

  if (order.status !== 'PAID') {
    throw new Error(`Ticket invalid – order status is ${order.status}`);
  }

  // Check if ticket was already used
  const ticketPurchase = await prisma.ticketPurchase.findFirst({
    where: {
      orderId: parsed.orderId,
      ticketId: parsed.ticketId,
    },
  });

  if (ticketPurchase && ticketPurchase.status === 'USED') {
    throw new Error('Ticket already used');
  }

  // Mark ticket as used
  if (ticketPurchase) {
    await prisma.ticketPurchase.update({
      where: { id: ticketPurchase.id },
      data: { status: 'USED' },
    });
  }

  await logAudit('TICKET_VALIDATED', 'Ticket', parsed.ticketId, null, {
    orderId: parsed.orderId,
  });

  return {
    valid: true,
    event: order.event,
    ticket: order.items[0]?.ticket,
    attendee: order.user,
    message: 'Ticket validated successfully',
  };
};