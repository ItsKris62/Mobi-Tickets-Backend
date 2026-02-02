"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletLogin = exports.refreshAccessToken = exports.generateRefreshToken = exports.loginUser = exports.registerUser = void 0;
const tslib_1 = require("tslib");
const argon2 = tslib_1.__importStar(require("argon2"));
const crypto_1 = require("crypto");
const prisma_1 = require("../../lib/prisma");
const redis_1 = require("../../lib/redis");
const env_1 = require("../../config/env");
const audit_1 = require("../../lib/audit");
const ethers_1 = require("ethers");
const generateAccessToken = async (fastify, payload) => {
    return fastify.jwt.sign(payload, {
        expiresIn: env_1.envConfig.JWT_ACCESS_EXPIRATION || '15m',
    });
};
const registerUser = async (data, fastify) => {
    const { email, password, fullName } = data;
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        throw new Error('Email already registered');
    }
    const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
    });
    const user = await prisma_1.prisma.user.create({
        data: {
            email,
            passwordHash,
            fullName,
            role: 'ATTENDEE',
        },
    });
    await (0, audit_1.logAudit)('USER_REGISTERED', 'User', user.id, user.id, { email });
    return {
        id: user.id,
        email: user.email,
        role: user.role,
    };
};
exports.registerUser = registerUser;
const loginUser = async (data, fastify) => {
    const { email, password } = data;
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
        throw new Error('Invalid credentials');
    }
    const isValidPassword = await argon2.verify(user.passwordHash, password);
    if (!isValidPassword) {
        throw new Error('Invalid credentials');
    }
    const accessToken = await generateAccessToken(fastify, {
        id: user.id,
        email: user.email,
        role: user.role,
    });
    const refreshToken = await (0, exports.generateRefreshToken)(user.id);
    await (0, audit_1.logAudit)('USER_LOGIN_SUCCESS', 'User', user.id, user.id, { email });
    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
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
    if (nonceExists) {
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
    await redis_1.redis.setex(nonceKey, 600, '1');
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
//# sourceMappingURL=auth.service.js.map