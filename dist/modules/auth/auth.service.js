"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutUser = exports.invalidateUserProfileCache = exports.validateToken = exports.requestPasswordReset = exports.walletLogin = exports.refreshAccessToken = exports.generateRefreshToken = exports.loginUser = exports.registerAndLogin = exports.registerUser = void 0;
const tslib_1 = require("tslib");
const argon2 = tslib_1.__importStar(require("argon2"));
const crypto_1 = require("crypto");
const prisma_1 = require("../../lib/prisma");
const redis_1 = require("../../lib/redis");
const env_1 = require("../../config/env");
const audit_1 = require("../../lib/audit");
const ethers_1 = require("ethers");
const ARGON2_PARAMS = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
};
const USER_PROFILE_CACHE_TTL = 60;
const generateAccessToken = async (fastify, payload) => {
    return fastify.jwt.sign(payload, {
        expiresIn: env_1.envConfig.JWT_ACCESS_EXPIRATION || '15m',
    });
};
const registerUser = async (data, _fastify) => {
    const { email, password, fullName, role = 'ATTENDEE', phoneNumber, dateOfBirth, idNumber, county, city, emergencyContact, } = data;
    const [existingEmail, existingPhone] = await Promise.all([
        prisma_1.prisma.user.findUnique({ where: { email } }),
        phoneNumber ? prisma_1.prisma.user.findFirst({ where: { phoneNumber } }) : Promise.resolve(null),
    ]);
    if (existingEmail) {
        throw new Error('Email already registered');
    }
    if (existingPhone) {
        throw new Error('Phone number already registered');
    }
    const passwordHash = await argon2.hash(password, ARGON2_PARAMS);
    const user = await prisma_1.prisma.user.create({
        data: {
            email,
            passwordHash,
            fullName,
            role,
            phoneNumber,
            dateOfBirth,
            idNumber,
            county,
            city,
            emergencyContact: emergencyContact ? emergencyContact : undefined,
        },
    });
    await (0, audit_1.logAudit)('USER_REGISTERED', 'User', user.id, user.id, {
        email,
        role,
        phoneNumber: phoneNumber ? '***' + phoneNumber.slice(-4) : undefined,
    });
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName ?? undefined,
        phoneNumber: user.phoneNumber ?? undefined,
        dateOfBirth: user.dateOfBirth?.toISOString(),
        county: user.county ?? undefined,
        city: user.city ?? undefined,
        isVerified: user.isVerified,
    };
};
exports.registerUser = registerUser;
const registerAndLogin = async (data, fastify) => {
    const userResponse = await (0, exports.registerUser)(data, fastify);
    const [accessToken, refreshToken] = await Promise.all([
        generateAccessToken(fastify, {
            id: userResponse.id,
            email: userResponse.email,
            role: userResponse.role,
        }),
        (0, exports.generateRefreshToken)(userResponse.id),
    ]);
    await (0, audit_1.logAudit)('USER_AUTO_LOGIN_AFTER_REGISTER', 'User', userResponse.id, userResponse.id, {
        email: userResponse.email,
    });
    return {
        accessToken,
        refreshToken,
        user: {
            id: userResponse.id,
            email: userResponse.email,
            role: userResponse.role,
            fullName: userResponse.fullName,
            phoneNumber: userResponse.phoneNumber,
            isVerified: userResponse.isVerified,
        },
    };
};
exports.registerAndLogin = registerAndLogin;
const loginUser = async (data, fastify) => {
    const { email, password } = data;
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
        throw new Error('Invalid credentials');
    }
    if (!user.isActive) {
        throw new Error('Account is deactivated. Please contact support.');
    }
    const isValidPassword = await argon2.verify(user.passwordHash, password);
    if (!isValidPassword) {
        throw new Error('Invalid credentials');
    }
    if (argon2.needsRehash(user.passwordHash, ARGON2_PARAMS)) {
        const newHash = await argon2.hash(password, ARGON2_PARAMS);
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
        await redis_1.redis.del(`user:profile:${user.id}`);
    }
    const [accessToken, refreshToken] = await Promise.all([
        generateAccessToken(fastify, { id: user.id, email: user.email, role: user.role }),
        (0, exports.generateRefreshToken)(user.id),
    ]);
    await (0, audit_1.logAudit)('USER_LOGIN_SUCCESS', 'User', user.id, user.id, { email });
    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName ?? undefined,
            avatarUrl: user.avatarUrl ?? undefined,
            phoneNumber: user.phoneNumber ?? undefined,
            isVerified: user.isVerified,
        },
    };
};
exports.loginUser = loginUser;
const generateRefreshToken = async (userId) => {
    const token = (0, crypto_1.randomBytes)(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma_1.prisma.refreshToken.create({
        data: {
            userId,
            token,
            expiresAt,
            revoked: false,
        },
    });
    await (0, audit_1.logAudit)('REFRESH_TOKEN_ISSUED', 'User', userId, userId, { expiresAt });
    return token;
};
exports.generateRefreshToken = generateRefreshToken;
const refreshAccessToken = async (data, fastify) => {
    const { refreshToken } = data;
    const stored = await prisma_1.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
    });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
        throw new Error('Invalid or expired refresh token');
    }
    const user = stored.user;
    if (!user) {
        throw new Error('User not found');
    }
    const accessToken = await generateAccessToken(fastify, {
        id: user.id,
        email: user.email,
        role: user.role,
    });
    await prisma_1.prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { revoked: true },
    });
    const newRefresh = await (0, exports.generateRefreshToken)(user.id);
    await (0, audit_1.logAudit)('REFRESH_TOKEN_ROTATED', 'User', user.id, user.id);
    return {
        accessToken,
        refreshToken: newRefresh,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
        },
    };
};
exports.refreshAccessToken = refreshAccessToken;
const walletLogin = async (data, fastify) => {
    const { address, signature, message, nonce, timestamp } = data;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const maxAge = 5 * 60;
    if (Math.abs(currentTimestamp - timestamp) > maxAge) {
        throw new Error('Signature expired. Please try again.');
    }
    const nonceKey = `wallet_nonce:${nonce}`;
    const nonceExists = await redis_1.redis.exists(nonceKey);
    if (nonceExists > 0) {
        throw new Error('Nonce already used. Potential replay attack detected.');
    }
    const expectedMessagePattern = `Sign this message to authenticate with MobiTickets.\n\nAddress: ${address.toLowerCase()}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
    if (message !== expectedMessagePattern) {
        throw new Error('Invalid message format');
    }
    try {
        const recovered = ethers_1.ethers.verifyMessage(message, signature);
        if (recovered.toLowerCase() !== address.toLowerCase()) {
            throw new Error('Invalid signature');
        }
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        throw new Error(`Wallet verification failed: ${errorMessage}`);
    }
    await redis_1.redis.set(nonceKey, '1', { ex: 600 });
    const walletEmail = `${address.toLowerCase()}@wallet`;
    let user = await prisma_1.prisma.user.findFirst({
        where: { email: walletEmail },
    });
    if (!user) {
        user = await prisma_1.prisma.user.create({
            data: {
                email: walletEmail,
                passwordHash: '',
                role: 'ATTENDEE',
                fullName: `Wallet User ${address.slice(0, 6)}`,
            },
        });
        await (0, audit_1.logAudit)('WALLET_USER_CREATED', 'User', user.id, user.id, { address });
    }
    const accessToken = await generateAccessToken(fastify, {
        id: user.id,
        address,
        role: user.role,
    });
    const refreshToken = await (0, exports.generateRefreshToken)(user.id);
    await (0, audit_1.logAudit)('WALLET_LOGIN_SUCCESS', 'User', user.id, user.id, { address });
    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            role: user.role,
            address,
        },
    };
};
exports.walletLogin = walletLogin;
const requestPasswordReset = async (data) => {
    const { email } = data;
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (user) {
        const resetToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const redisKey = `pwd_reset:${resetToken}`;
        await redis_1.redis.set(redisKey, user.id, { ex: 3600 });
        await (0, audit_1.logAudit)('PASSWORD_RESET_REQUESTED', 'User', user.id, user.id, { email });
    }
    return { message: 'If an account with that email exists, a reset link has been sent.' };
};
exports.requestPasswordReset = requestPasswordReset;
const validateToken = async (userId) => {
    const cacheKey = `user:profile:${userId}`;
    try {
        const cached = await redis_1.redis.get(cacheKey);
        if (cached) {
            const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
            return { valid: true, user: parsed };
        }
    }
    catch (cacheErr) {
        console.warn('[validateToken] Redis cache miss or error:', cacheErr);
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            role: true,
            fullName: true,
            avatarUrl: true,
            isVerified: true,
            isBanned: true,
        },
    });
    if (!user) {
        throw new Error('User not found');
    }
    const userPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
    };
    try {
        await redis_1.redis.set(cacheKey, JSON.stringify(userPayload), { ex: USER_PROFILE_CACHE_TTL });
    }
    catch (cacheErr) {
        console.warn('[validateToken] Failed to cache user profile:', cacheErr);
    }
    return { valid: true, user: userPayload };
};
exports.validateToken = validateToken;
const invalidateUserProfileCache = async (userId) => {
    try {
        await redis_1.redis.del(`user:profile:${userId}`);
    }
    catch (err) {
        console.warn('[invalidateUserProfileCache] Failed to invalidate cache:', err);
    }
};
exports.invalidateUserProfileCache = invalidateUserProfileCache;
const logoutUser = async (data, userId) => {
    const { refreshToken } = data;
    const stored = await prisma_1.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
    });
    if (stored && stored.userId === userId) {
        await prisma_1.prisma.refreshToken.update({
            where: { token: refreshToken },
            data: { revoked: true },
        });
    }
    await (0, exports.invalidateUserProfileCache)(userId);
    await (0, audit_1.logAudit)('USER_LOGOUT', 'User', userId, userId);
    return { message: 'Logged out successfully' };
};
exports.logoutUser = logoutUser;
//# sourceMappingURL=auth.service.js.map