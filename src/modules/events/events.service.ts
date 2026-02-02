import { prisma } from '../../lib/prisma';
import { uploadEventPoster, uploadEventTrailer } from '../../lib/cloudinary';
import { CreateEventInput } from './events.schema';
import { MultipartFile } from '@fastify/multipart';

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
    where: query.upcoming ? { startTime: { gt: new Date() }, isPublished: true } : undefined,
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
          type: true,
          price: true,
          availableQuantity: true,
          status: true,
        },
      },
    },
  });
};

export const getEventById = async (eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
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
          type: true,
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
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.organizerId !== userId && userRole !== 'ADMIN') {
    throw new Error('Unauthorized: You can only delete your own events');
  }

  await prisma.event.delete({
    where: { id: eventId },
  });

  return { message: 'Event deleted successfully' };
};