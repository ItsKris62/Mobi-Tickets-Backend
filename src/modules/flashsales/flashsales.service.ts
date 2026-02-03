import { prisma } from '../../lib/prisma';
import { TicketCategory } from '@prisma/client';
import { notifyEventAttendees } from '../notifications/notification.service';

interface CreateFlashSaleInput {
  eventId: string;
  name: string;
  description?: string;
  discountPercent: number;
  discountAmount?: number;
  startTime: Date;
  endTime: Date;
  maxRedemptions?: number;
  promoCode?: string;
  ticketCategories?: TicketCategory[];
}

interface UpdateFlashSaleInput {
  name?: string;
  description?: string;
  discountPercent?: number;
  discountAmount?: number;
  startTime?: Date;
  endTime?: Date;
  maxRedemptions?: number;
  isActive?: boolean;
  ticketCategories?: TicketCategory[];
}

// Create a new flash sale
export const createFlashSale = async (
  data: CreateFlashSaleInput,
  organizerId: string
) => {
  // Verify organizer owns the event
  const event = await prisma.event.findUnique({
    where: { id: data.eventId },
    select: { organizerId: true, title: true },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.organizerId !== organizerId) {
    throw new Error('Unauthorized: You can only create flash sales for your own events');
  }

  // Validate dates
  if (data.startTime >= data.endTime) {
    throw new Error('End time must be after start time');
  }

  // Check for duplicate promo code
  if (data.promoCode) {
    const existingPromo = await prisma.flashSale.findUnique({
      where: { promoCode: data.promoCode },
    });
    if (existingPromo) {
      throw new Error('Promo code already exists');
    }
  }

  const flashSale = await prisma.flashSale.create({
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

// Get flash sales for an event
export const getEventFlashSales = async (
  eventId: string,
  organizerId: string,
  userRole: string
) => {
  // Verify organizer owns the event or is admin
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.organizerId !== organizerId && userRole !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  return prisma.flashSale.findMany({
    where: { eventId },
    orderBy: { startTime: 'desc' },
  });
};

// Get active flash sales for an event (public)
export const getActiveFlashSales = async (eventId: string) => {
  const now = new Date();

  return prisma.flashSale.findMany({
    where: {
      eventId,
      isActive: true,
      startTime: { lte: now },
      endTime: { gte: now },
      OR: [
        { maxRedemptions: null },
        {
          maxRedemptions: {
            gt: prisma.flashSale.fields.currentRedemptions,
          },
        },
      ],
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
    },
  });
};

// Update a flash sale
export const updateFlashSale = async (
  flashSaleId: string,
  data: UpdateFlashSaleInput,
  organizerId: string,
  userRole: string
) => {
  const flashSale = await prisma.flashSale.findUnique({
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

  return prisma.flashSale.update({
    where: { id: flashSaleId },
    data,
  });
};

// Delete a flash sale
export const deleteFlashSale = async (
  flashSaleId: string,
  organizerId: string,
  userRole: string
) => {
  const flashSale = await prisma.flashSale.findUnique({
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

  await prisma.flashSale.delete({
    where: { id: flashSaleId },
  });

  return { message: 'Flash sale deleted successfully' };
};

// Validate and apply promo code
export const validatePromoCode = async (
  eventId: string,
  promoCode: string,
  ticketCategory: TicketCategory
) => {
  const now = new Date();

  const flashSale = await prisma.flashSale.findFirst({
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

  // Check if max redemptions reached
  if (flashSale.maxRedemptions && flashSale.currentRedemptions >= flashSale.maxRedemptions) {
    throw new Error('Promo code has reached its maximum usage limit');
  }

  // Check if ticket category applies
  if (flashSale.ticketCategories.length > 0 && !flashSale.ticketCategories.includes(ticketCategory)) {
    throw new Error('This promo code does not apply to the selected ticket category');
  }

  return {
    flashSaleId: flashSale.id,
    discountPercent: flashSale.discountPercent,
    discountAmount: flashSale.discountAmount,
    name: flashSale.name,
  };
};

// Redeem a flash sale (increment counter)
export const redeemFlashSale = async (flashSaleId: string) => {
  return prisma.flashSale.update({
    where: { id: flashSaleId },
    data: {
      currentRedemptions: { increment: 1 },
    },
  });
};

// Trigger flash sale notification to attendees
export const triggerFlashSaleNotification = async (
  flashSaleId: string,
  organizerId: string
) => {
  const flashSale = await prisma.flashSale.findUnique({
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

  // Send notification to all users who have favorited or viewed this event
  const endTime = flashSale.endTime.toLocaleDateString('en-KE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const { notifiedCount } = await notifyEventAttendees(
    flashSale.eventId,
    'FLASH_SALE',
    `🔥 Flash Sale: ${flashSale.name}`,
    `Save ${flashSale.discountPercent}% on tickets for "${flashSale.event.title}"! Offer ends ${endTime}.${flashSale.promoCode ? ` Use code: ${flashSale.promoCode}` : ''}`,
    {
      flashSaleId: flashSale.id,
      eventId: flashSale.eventId,
      eventTitle: flashSale.event.title,
      discountPercent: flashSale.discountPercent,
      promoCode: flashSale.promoCode,
      endTime: flashSale.endTime.toISOString(),
    },
    true
  );

  return { notifiedCount };
};
