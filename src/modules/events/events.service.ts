import { prisma } from '../../lib/prisma';
import { uploadEventPoster, uploadEventTrailer } from '../../lib/cloudinary';
import { CreateEventInput, GetEventsQuery } from './events.schema';
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

/** Shape returned by GET /events (public listing) */
function formatPublicEvent(event: any) {
  const location = (typeof event.location === 'object' && event.location !== null)
    ? event.location as { venue?: string; address?: string }
    : {};

  const availableTickets = (event.tickets || []).filter(
    (t: any) => t.status === 'AVAILABLE' && t.availableQuantity > 0
  );
  const prices = availableTickets.map((t: any) => Number(t.price));
  const totalAvailable = (event.tickets || []).reduce(
    (sum: number, t: any) => sum + (t.availableQuantity || 0),
    0
  );

  return {
    id: event.id,
    title: event.title,
    description: event.description ? event.description.substring(0, 200) : '',
    posterUrl: event.posterUrl || null,
    category: event.category || '',
    venue: location.venue || '',
    location: location.address || '',
    county: event.county || '',
    startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
    endTime: event.endTime
      ? (event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime)
      : null,
    isFeatured: event.isFeatured ?? false,
    organizer: {
      id: event.organizer.id,
      name: event.organizer.fullName || '',
      avatarUrl: event.organizer.avatarUrl || null,
    },
    ticketSummary: {
      lowestPrice: prices.length > 0 ? Math.min(...prices) : 0,
      highestPrice: prices.length > 0 ? Math.max(...prices) : 0,
      totalAvailable,
      categories: (event.tickets || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        price: Number(t.price),
        available: t.availableQuantity,
      })),
    },
    isSoldOut: totalAvailable === 0,
    createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
  };
}

const ORGANIZER_PUBLIC_SELECT = {
  id: true,
  fullName: true,
  avatarUrl: true,
  // email intentionally excluded from public endpoints
} as const;

const TICKET_SELECT = {
  id: true,
  category: true,
  name: true,
  price: true,
  totalQuantity: true,
  availableQuantity: true,
  status: true,
} as const;

export const getEvents = async (query: GetEventsQuery) => {
  const { page, limit, search, category, county, featured, startDate, endDate, sortBy, sortOrder } = query;

  const where: any = {
    isPublished: true,
    status: 'PUBLISHED',
    deletedAt: null,
    ...(search && {
      OR: [
        { title: { contains: search } },
        { description: { contains: search } },
      ],
    }),
    ...(category && { category }),
    ...(county && { county }),
    ...(featured === 'true' && { isFeatured: true }),
    ...(startDate && { startTime: { gte: new Date(startDate) } }),
    ...(endDate && { startTime: { lte: new Date(endDate) } }),
  };

  const [totalItems, events, allCategories, allCounties] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      include: {
        organizer: { select: ORGANIZER_PUBLIC_SELECT },
        tickets: { select: TICKET_SELECT },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.event.findMany({
      where: { isPublished: true, status: 'PUBLISHED', deletedAt: null, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    }),
    prisma.event.findMany({
      where: { isPublished: true, status: 'PUBLISHED', deletedAt: null, county: { not: null } },
      select: { county: true },
      distinct: ['county'],
    }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    events: events.map(formatPublicEvent),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    filters: {
      categories: allCategories.map((c: any) => c.category).filter(Boolean),
      counties: allCounties.map((c: any) => c.county).filter(Boolean),
    },
  };
};

export const getEventById = async (eventId: string) => {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      isPublished: true,
      status: 'PUBLISHED',
      deletedAt: null,
    },
    include: {
      organizer: { select: ORGANIZER_PUBLIC_SELECT },
      tickets: { select: TICKET_SELECT },
    },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  const location = (typeof event.location === 'object' && event.location !== null)
    ? event.location as { venue?: string; address?: string }
    : {};

  const totalAvailable = event.tickets.reduce(
    (sum, t) => sum + (t.availableQuantity || 0),
    0
  );

  return {
    id: event.id,
    title: event.title,
    description: event.description || '',
    posterUrl: event.posterUrl || null,
    category: event.category || '',
    venue: location.venue || '',
    location: location.address || '',
    county: event.county || '',
    startTime: event.startTime.toISOString(),
    endTime: event.endTime?.toISOString() || null,
    isFeatured: event.isFeatured,
    status: event.status,
    organizer: {
      id: event.organizer.id,
      name: event.organizer.fullName || '',
      avatarUrl: event.organizer.avatarUrl || null,
    },
    tickets: event.tickets.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      price: Number(t.price),
      totalQuantity: t.totalQuantity,
      availableQuantity: t.availableQuantity,
      available: t.availableQuantity,
      status: t.status,
    })),
    isSoldOut: totalAvailable === 0,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
};

export const updateEvent = async (
  eventId: string,
  userId: string,
  userRole: string,
  data: Partial<CreateEventInput>,
  posterFile?: MultipartFile,
  trailerFile?: MultipartFile
) => {
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

  await prisma.event.update({
    where: { id: eventId },
    data: { deletedAt: new Date() },
  });

  return { message: 'Event deleted successfully' };
};

export const postponeEvent = async (
  eventId: string,
  userId: string,
  userRole: string,
  newStartTime: Date,
  newEndTime: Date | null,
  reason: string
) => {
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

  const originalStartTime = event.originalStartTime || event.startTime;

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

  const formattedOldDate = event.startTime.toLocaleDateString('en-KE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const formattedNewDate = newStartTime.toLocaleDateString('en-KE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
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
    true
  );

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

export const cancelEvent = async (
  eventId: string,
  userId: string,
  userRole: string,
  reason: string
) => {
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

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      status: 'CANCELLED',
      isPublished: false,
    },
  });

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

  const { notifiedCount } = await notifyEventAttendees(
    eventId,
    'EVENT_CANCELLED',
    `Event Cancelled: ${event.title}`,
    `We regret to inform you that "${event.title}" has been cancelled.\n\nReason: ${reason}\n\nRefund processing will begin shortly. You will receive an email with refund details.`,
    { eventId, eventTitle: event.title, reason },
    true
  );

  await logAudit('EVENT_CANCELLED', 'Event', eventId, userId, {
    reason,
    attendeesNotified: notifiedCount,
  });

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

export const getFeaturedEvents = async (limit = 10) => {
  const events = await prisma.event.findMany({
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
      organizer: { select: ORGANIZER_PUBLIC_SELECT },
      tickets: { select: TICKET_SELECT },
    },
  });

  return events.map(formatPublicEvent);
};

export const getEventAttendees = async (
  eventId: string,
  userId: string,
  userRole: string,
  page = 1,
  limit = 20
) => {
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
