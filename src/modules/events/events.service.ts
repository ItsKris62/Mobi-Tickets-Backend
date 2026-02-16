import { prisma } from '../../lib/prisma';
import { uploadEventPoster, uploadEventTrailer } from '../../lib/cloudinary';
import { CreateEventInput } from './events.schema';
import { MultipartFile } from '@fastify/multipart';
import { notifyEventAttendees, notifyAdmins } from '../notifications/notification.service';
import { logAudit } from '../../lib/audit';
import { createSystemAlert } from '../alerts/alerts.service';

export const createEvent = async (
  data: CreateEventInput,
  organizerId: string,
  posterFile?: MultipartFile,
  trailerFile?: MultipartFile
) => {
  let posterUrl: string | undefined;
  let videoUrl: string | undefined;

  if (posterFile) posterUrl = await uploadEventPoster(posterFile);
  if (trailerFile) videoUrl = await uploadEventTrailer(trailerFile);

  return prisma.event.create({
    data: {
      ...data,
      organizerId,
      posterUrl,
      videoUrl,
      isPublished: false,
    },
  });
};

export const getEvents = async (query: { upcoming?: boolean }) => {
  return prisma.event.findMany({
    where: {
      deletedAt: null,
      ...(query.upcoming ? { startTime: { gt: new Date() }, isPublished: true } : {}),
    },
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
          category: true,
          name: true,
          price: true,
          totalQuantity: true,
          availableQuantity: true,
          status: true,
        },
      },
    },
  });
};

export const getEventById = async (eventId: string) => {
  const event = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
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
          category: true,
          name: true,
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

export const updateEvent = async (
  eventId: string,
  userId: string,
  userRole: string,
  data: Partial<CreateEventInput>,
  posterFile?: MultipartFile,
  trailerFile?: MultipartFile
) => {
  // Check ownership
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.organizerId !== userId && userRole !== 'ADMIN') {
    throw new Error('Unauthorized: You can only update your own events');
  }

  let posterUrl: string | undefined;
  let videoUrl: string | undefined;

  if (posterFile) posterUrl = await uploadEventPoster(posterFile);
  if (trailerFile) videoUrl = await uploadEventTrailer(trailerFile);

  return prisma.event.update({
    where: { id: eventId },
    data: {
      ...data,
      ...(posterUrl && { posterUrl }),
      ...(videoUrl && { videoUrl }),
    },
  });
};

export const deleteEvent = async (
  eventId: string,
  userId: string,
  userRole: string
) => {
  // Check ownership
  const event = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
    select: { organizerId: true },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.organizerId !== userId && userRole !== 'ADMIN') {
    throw new Error('Unauthorized: You can only delete your own events');
  }

  // Soft delete
  await prisma.event.update({
    where: { id: eventId },
    data: { deletedAt: new Date() },
  });

  return { message: 'Event deleted successfully' };
};

// Postpone event
export const postponeEvent = async (
  eventId: string,
  userId: string,
  userRole: string,
  newStartTime: Date,
  newEndTime: Date | null,
  reason: string
) => {
  // Check ownership
  const event = await prisma.event.findUnique({
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

  // Store original time if not already postponed
  const originalStartTime = event.originalStartTime || event.startTime;

  // Update event with new times and status
  const updatedEvent = await prisma.event.update({
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

  // Notify admin about postponement
  await notifyAdmins(
    'EVENT_POSTPONED',
    `Event Postponed: ${event.title}`,
    `The event "${event.title}" has been postponed by organizer ${event.organizer.fullName}. Reason: ${reason}`,
    {
      eventId,
      eventTitle: event.title,
      organizerName: event.organizer.fullName,
      organizerEmail: event.organizer.email,
      oldStartTime: event.startTime.toISOString(),
      newStartTime: newStartTime.toISOString(),
      reason,
    }
  );

  // Notify all ticket holders
  const formattedOldDate = event.startTime.toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedNewDate = newStartTime.toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const { notifiedCount } = await notifyEventAttendees(
    eventId,
    'EVENT_POSTPONED',
    `Event Postponed: ${event.title}`,
    `We regret to inform you that "${event.title}" has been postponed.\n\nOriginal Date: ${formattedOldDate}\nNew Date: ${formattedNewDate}\n\nReason: ${reason}\n\nYour tickets remain valid for the new date.`,
    {
      eventId,
      eventTitle: event.title,
      oldStartTime: event.startTime.toISOString(),
      newStartTime: newStartTime.toISOString(),
      reason,
    },
    true // Send email notifications
  );

  // Log the action
  await logAudit('EVENT_POSTPONED', 'Event', eventId, userId, {
    oldStartTime: event.startTime.toISOString(),
    newStartTime: newStartTime.toISOString(),
    reason,
    attendeesNotified: notifiedCount,
  });

  return {
    event: updatedEvent,
    attendeesNotified: notifiedCount,
    message: 'Event postponed successfully. All ticket holders have been notified.',
  };
};

// Cancel event
export const cancelEvent = async (
  eventId: string,
  userId: string,
  userRole: string,
  reason: string
) => {
  // Check ownership
  const event = await prisma.event.findUnique({
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

  // Update event status
  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      status: 'CANCELLED',
      isPublished: false,
    },
  });

  // Notify admin about cancellation
  await notifyAdmins(
    'EVENT_CANCELLED',
    `Event Cancelled: ${event.title}`,
    `The event "${event.title}" has been cancelled by organizer ${event.organizer.fullName}. Reason: ${reason}`,
    {
      eventId,
      eventTitle: event.title,
      organizerName: event.organizer.fullName,
      organizerEmail: event.organizer.email,
      reason,
    }
  );

  // Notify all ticket holders
  const { notifiedCount } = await notifyEventAttendees(
    eventId,
    'EVENT_CANCELLED',
    `Event Cancelled: ${event.title}`,
    `We regret to inform you that "${event.title}" has been cancelled.\n\nReason: ${reason}\n\nRefund processing will begin shortly. You will receive an email with refund details.`,
    {
      eventId,
      eventTitle: event.title,
      reason,
    },
    true
  );

  // Log the action
  await logAudit('EVENT_CANCELLED', 'Event', eventId, userId, {
    reason,
    attendeesNotified: notifiedCount,
  });

  // Auto-generate system alert
  await createSystemAlert(
    'event',
    'high',
    `Event Cancelled: ${event.title}`,
    `Event "${event.title}" was cancelled. Reason: ${reason}. ${notifiedCount} attendees notified.`,
    { eventId, organizerName: event.organizer.fullName, reason, attendeesNotified: notifiedCount }
  );

  return {
    event: updatedEvent,
    attendeesNotified: notifiedCount,
    message: 'Event cancelled. All ticket holders have been notified and refunds will be processed.',
  };
};

// Publish event (with validation)
export const publishEvent = async (
  eventId: string,
  userId: string,
  userRole: string
) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { tickets: true },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.organizerId !== userId && userRole !== 'ADMIN') {
    throw new Error('Unauthorized: You can only publish your own events');
  }

  // Validation checks
  if (!event.posterUrl) {
    throw new Error('Event poster is required before publishing');
  }

  if (!event.title || !event.description) {
    throw new Error('Event title and description are required');
  }

  if (event.tickets.length === 0) {
    throw new Error('At least one ticket category must be created before publishing');
  }

  if (event.startTime < new Date()) {
    throw new Error('Event start time must be in the future');
  }

  return prisma.event.update({
    where: { id: eventId },
    data: {
      isPublished: true,
      status: 'PUBLISHED',
    },
  });
};

// Get organizer's events
export const getOrganizerEvents = async (
  organizerId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
) => {
  const { status, limit = 50, offset = 0 } = options || {};

  return prisma.event.findMany({
    where: {
      organizerId,
      deletedAt: null,
      ...(status && { status: status as any }),
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

// Get featured events
export const getFeaturedEvents = async (limit = 10) => {
  return prisma.event.findMany({
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
      organizer: {
        select: { id: true, fullName: true, email: true },
      },
      tickets: {
        select: {
          id: true,
          category: true,
          name: true,
          price: true,
          availableQuantity: true,
          status: true,
        },
      },
    },
  });
};

// Get event attendees (for organizer/admin)
export const getEventAttendees = async (
  eventId: string,
  userId: string,
  userRole: string,
  page = 1,
  limit = 20
) => {
  // Check ownership (organizer can only see their own event attendees)
  const event = await prisma.event.findUnique({
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
    prisma.ticketPurchase.findMany({
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
    prisma.ticketPurchase.count({
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