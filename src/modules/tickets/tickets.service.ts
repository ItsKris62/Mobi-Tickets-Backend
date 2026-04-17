// Ticket business logic – atomic purchases with Prisma transactions + QR generation
import { prisma } from '../../lib/prisma';
import { logAudit } from '../../lib/audit';
import { createNotification } from '../notifications/notification.service';
import crypto from 'crypto';
import { generateQRCodeData, verifyQRCodeData } from '../../utils/qr-code';
import { computeEventAnalytics } from '../../utils/analytics';
import { invalidateOrganizerAnalyticsCache } from './analytics.service';

/** Generates a human-readable ticket number: MBT-YYYYMMDD-XXXX */
function generateTicketNumber(eventDate: Date): string {
  const dateStr = new Date(eventDate).toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 4);
  return `MBT-${dateStr}-${random}`;
}

// Purchase tickets (transaction-safe to prevent oversell)
export const purchaseTickets = async (
  userId: string,
  ticketId: string,
  quantity: number
) => {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await prisma.$transaction(async (tx: any) => {
        // Lock & check availability
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
            status: 'PAID', // Instantly confirmed for "pay-at-venue" logic
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

        // Create individual TicketPurchases with placeholders
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
              qrCodeData: crypto.randomUUID(), // Temporary unique placeholder
            }
          });
          createdPurchases.push(purchase);
        }

        // Now update with real, signed QR codes
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
          const qrCodeData = generateQRCodeData(qrPayload);
          const updatedPurchase = await tx.ticketPurchase.update({
            where: { id: purchase.id },
            data: { qrCodeData }
          });
          finalPurchases.push(updatedPurchase);
        }

        // Get user and event info for confirmation
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { email: true, fullName: true },
        });

        // Create in-app notification
        try {
          await createNotification({
            userId,
            eventId: ticket.eventId,
            type: 'TICKET_PURCHASE',
            title: '🎫 Ticket Purchase Confirmed',
            message: `You purchased ${quantity} ticket(s) for "${ticket.event.title}". Order ID: ${order.id}`,
            data: { orderId: order.id, ticketId, quantity },
          });
        } catch {
          // Non-critical
        }

        await logAudit('TICKET_PURCHASED', 'Order', order.id, userId, { ticketId, quantity });

        // Return the first QR code for immediate display on frontend success screen
        return { order, qrCode: finalPurchases[0]?.qrCodeData };
      });
    } catch (error: any) {
      // P2002 is Prisma's unique constraint violation error code
      if (error.code === 'P2002' && (error.meta?.target?.includes('ticketNumber') || error.meta?.target === 'ticketNumber')) {
        attempts++;
        console.warn(`[purchaseTickets] Ticket number collision detected. Retrying... (Attempt ${attempts} of ${maxAttempts})`);
        if (attempts >= maxAttempts) throw new Error('High booking volume. Please try again later.');
        continue; // Retry the entire transaction on ticketNumber collision
      }
      throw error; // Rethrow other errors immediately
    }
  }

  // After a successful purchase, trigger analytics update (outside the retry loop)
  try {
    const ticketInfo = await prisma.ticket.findUnique({ 
      where: { id: ticketId }, 
      select: { eventId: true, event: { select: { organizerId: true } } } 
    });
    if (ticketInfo) {
      await computeEventAnalytics(ticketInfo.eventId);
      await invalidateOrganizerAnalyticsCache(ticketInfo.event.organizerId);
    }
  } catch (analyticsError) {
    console.error(`[Analytics] Failed to update analytics for event after purchase:`, analyticsError);
  }
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
  const payload = verifyQRCodeData(qrData);

  if (!payload) {
    return { valid: false, message: 'Invalid or tampered QR code.' };
  }

  const { ticketId, eventId, ticketType } = payload;

  // Find the ticket purchase record
  const ticketPurchase = await prisma.ticketPurchase.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { fullName: true } },
      event: { select: { title: true, organizerId: true } },
    }
  });

  if (!ticketPurchase) {
    return { valid: false, message: 'Ticket not found. Invalid QR code.' };
  }

  // Security check: Does the ticket belong to the event it's being scanned for?
  if (ticketPurchase.eventId !== eventId) {
    return { valid: false, message: 'Ticket is for a different event.' };
  }

  // Check status
  if (ticketPurchase.status === 'USED') {
    return {
      valid: false,
      message: `Ticket already used at ${new Date(ticketPurchase.checkedInAt!).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`,
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

  // All checks passed. Mark as USED.
  const now = new Date();
  const updatedTicket = await prisma.ticketPurchase.update({
    where: { id: ticketId },
    data: { status: 'USED', checkedInAt: now },
  });

  await logAudit('TICKET_VALIDATED', 'TicketPurchase', ticketId, null, { eventId });

  // Trigger analytics update
  try {
    await computeEventAnalytics(eventId);
    await invalidateOrganizerAnalyticsCache(ticketPurchase.event.organizerId);
  } catch (analyticsError) {
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