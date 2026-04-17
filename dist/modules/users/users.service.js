"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPreferences = exports.getUserPreferences = exports.removeFavorite = exports.addFavorite = exports.getUserFavorites = exports.updateAvatar = exports.updateProfile = exports.getProfile = void 0;
const prisma_1 = require("../../lib/prisma");
const client_1 = require("@prisma/client");
const cloudinary_1 = require("../../lib/cloudinary");
const getProfile = async (userId) => {
    return prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, fullName: true, bio: true, avatarUrl: true, role: true },
    });
};
exports.getProfile = getProfile;
const updateProfile = async (userId, data) => {
    return prisma_1.prisma.user.update({
        where: { id: userId },
        data,
        select: { id: true, fullName: true, bio: true },
    });
};
exports.updateProfile = updateProfile;
const updateAvatar = async (userId, file) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
    });
    if (user?.avatarUrl) {
        const publicId = (0, cloudinary_1.extractPublicId)(user.avatarUrl);
        if (publicId) {
            try {
                await (0, cloudinary_1.deleteFromCloudinary)(publicId);
            }
            catch {
            }
        }
    }
    const avatarUrl = await (0, cloudinary_1.uploadUserAvatar)(file);
    return prisma_1.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
        select: { id: true, email: true, fullName: true, bio: true, avatarUrl: true, role: true },
    });
};
exports.updateAvatar = updateAvatar;
const getUserFavorites = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [favorites, total] = await Promise.all([
        prisma_1.prisma.favorite.findMany({
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
        prisma_1.prisma.favorite.count({ where: { userId } }),
    ]);
    return {
        favorites: favorites.map((f) => f.event),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
exports.getUserFavorites = getUserFavorites;
const addFavorite = async (userId, eventId) => {
    const event = await prisma_1.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
        throw new Error('Event not found');
    }
    await prisma_1.prisma.favorite.upsert({
        where: { userId_eventId: { userId, eventId } },
        update: {},
        create: { userId, eventId },
    });
    return { message: 'Event added to favorites' };
};
exports.addFavorite = addFavorite;
const removeFavorite = async (userId, eventId) => {
    try {
        await prisma_1.prisma.favorite.delete({
            where: { userId_eventId: { userId, eventId } },
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new Error('Favorite not found');
        }
        throw error;
    }
    return { message: 'Event removed from favorites' };
};
exports.removeFavorite = removeFavorite;
const getUserPreferences = async (userId) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
    });
    if (!user) {
        throw new Error('User not found');
    }
    return user.preferences || {};
};
exports.getUserPreferences = getUserPreferences;
const updateUserPreferences = async (userId, prefs) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
    });
    if (!user) {
        throw new Error('User not found');
    }
    const currentPrefs = user.preferences || {};
    const updatedPrefs = { ...currentPrefs, ...prefs };
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { preferences: updatedPrefs },
    });
    return updatedPrefs;
};
exports.updateUserPreferences = updateUserPreferences;
//# sourceMappingURL=users.service.js.map