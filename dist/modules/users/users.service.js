"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = void 0;
const prisma_1 = require("../../lib/prisma");
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
//# sourceMappingURL=users.service.js.map