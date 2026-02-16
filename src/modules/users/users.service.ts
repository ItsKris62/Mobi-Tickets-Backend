import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { MultipartFile } from '@fastify/multipart';
import { uploadUserAvatar, deleteFromCloudinary, extractPublicId } from '../../lib/cloudinary';

export const getProfile = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, bio: true, avatarUrl: true, role: true },
  });
};

export const updateProfile = async (userId: string, data: { fullName?: string; bio?: string }) => {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, fullName: true, bio: true },
  });
};

export const updateAvatar = async (userId: string, file: MultipartFile) => {
  // Get current user to check for existing avatar
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  // Delete old avatar from Cloudinary if it exists
  if (user?.avatarUrl) {
    const publicId = extractPublicId(user.avatarUrl);
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId);
      } catch {
        // Non-critical — old file cleanup failed, proceed with upload
      }
    }
  }

  // Upload new avatar
  const avatarUrl = await uploadUserAvatar(file);

  // Update user record
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: { id: true, email: true, fullName: true, bio: true, avatarUrl: true, role: true },
  });
};

// Favorites
export const getUserFavorites = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          include: {
            organizer: {
              select: { id: true, fullName: true },
            },
            tickets: {
              select: {
                id: true,
                name: true,
                price: true,
                availableQuantity: true,
              },
            },
          },
        },
      },
    }),
    prisma.favorite.count({ where: { userId } }),
  ]);

  return {
    favorites: favorites.map((f) => f.event),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const addFavorite = async (userId: string, eventId: string) => {
  // Verify event exists
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new Error('Event not found');
  }

  // Upsert to handle duplicates gracefully
  await prisma.favorite.upsert({
    where: { userId_eventId: { userId, eventId } },
    update: {},
    create: { userId, eventId },
  });

  return { message: 'Event added to favorites' };
};

export const removeFavorite = async (userId: string, eventId: string) => {
  try {
    await prisma.favorite.delete({
      where: { userId_eventId: { userId, eventId } },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new Error('Favorite not found');
    }
    throw error;
  }

  return { message: 'Event removed from favorites' };
};

// Preferences
export const getUserPreferences = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user.preferences || {};
};

export const updateUserPreferences = async (
  userId: string,
  prefs: { notifications?: boolean; language?: string; theme?: string }
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const currentPrefs = (user.preferences as Record<string, unknown>) || {};
  const updatedPrefs = { ...currentPrefs, ...prefs };

  await prisma.user.update({
    where: { id: userId },
    data: { preferences: updatedPrefs },
  });

  return updatedPrefs;
};