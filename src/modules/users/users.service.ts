import { prisma } from '../../lib/prisma';

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