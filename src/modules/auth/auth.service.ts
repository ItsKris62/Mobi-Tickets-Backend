import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { envConfig } from '../../config/env';
import { logAudit } from '../../lib/audit';
import { ethers } from 'ethers';
import {
  RegisterInput,
  LoginInput,
  RefreshInput,
  WalletLoginInput,
  AuthResponse,
  UserResponse,
} from './auth.schema';
import { FastifyInstance } from 'fastify';

// Helper to generate JWT
const generateAccessToken = async (
  fastify: FastifyInstance,
  payload: { id: string; email?: string; address?: string; role: string }
): Promise<string> => {
  return fastify.jwt.sign(payload, {
    expiresIn: envConfig.JWT_ACCESS_EXPIRATION || '15m',
  });
};

// Register new user (email/password)
export const registerUser = async (
  data: RegisterInput,
  _fastify: FastifyInstance
): Promise<UserResponse> => {
  const { email, password, fullName } = data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role: 'ATTENDEE',
    },
  });

  await logAudit('USER_REGISTERED', 'User', user.id, user.id, { email });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
};

// Traditional email/password login
export const loginUser = async (
  data: LoginInput,
  fastify: FastifyInstance
): Promise<AuthResponse> => {
  const { email, password } = data;

  const user = await prisma.user.findUnique({ where: { email } });
  
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

  const refreshToken = await generateRefreshToken(user.id);

  await logAudit('USER_LOGIN_SUCCESS', 'User', user.id, user.id, { email });

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

// Generate & store refresh token
export const generateRefreshToken = async (userId: string): Promise<string> => {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
      revoked: false,
    },
  });

  await logAudit('REFRESH_TOKEN_ISSUED', 'User', userId, userId, { expiresAt });

  return token;
};

// Refresh access token (rotate refresh for security)
export const refreshAccessToken = async (
  data: RefreshInput,
  fastify: FastifyInstance
): Promise<AuthResponse> => {
  const { refreshToken } = data;

  const stored = await prisma.refreshToken.findUnique({
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

  // Rotate refresh token for security
  await prisma.refreshToken.update({
    where: { token: refreshToken },
    data: { revoked: true },
  });

  const newRefresh = await generateRefreshToken(user.id);

  await logAudit('REFRESH_TOKEN_ROTATED', 'User', user.id, user.id);

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

// Wallet login (SIWE-style signature verification with replay protection)
export const walletLogin = async (
  data: WalletLoginInput,
  fastify: FastifyInstance
): Promise<AuthResponse> => {
  const { address, signature, message, nonce, timestamp } = data;

  // 1. Validate timestamp (must be within 5 minutes)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const maxAge = 5 * 60; // 5 minutes
  if (Math.abs(currentTimestamp - timestamp) > maxAge) {
    throw new Error('Signature expired. Please try again.');
  }

  // 2. Check nonce hasn't been used (Redis with TTL)
  const nonceKey = `wallet_nonce:${nonce}`;
  const nonceExists = await redis.exists(nonceKey);
  if (nonceExists) {
    throw new Error('Nonce already used. Potential replay attack detected.');
  }

  // 3. Validate message format (should include nonce and timestamp)
  const expectedMessagePattern = `Sign this message to authenticate with MobiTickets.\n\nAddress: ${address.toLowerCase()}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
  if (message !== expectedMessagePattern) {
    throw new Error('Invalid message format');
  }

  // 4. Recover & verify signature
  try {
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      throw new Error('Invalid signature');
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Wallet verification failed: ${errorMessage}`);
  }

  // 5. Store nonce to prevent replay (TTL = 10 minutes)
  await redis.setex(nonceKey, 600, '1');

  // Find or create user (using address as identifier)
  const walletEmail = `${address.toLowerCase()}@wallet`;
  
  let user = await prisma.user.findFirst({
    where: { email: walletEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: walletEmail,
        passwordHash: '', // Wallet users have no password
        role: 'ATTENDEE',
        fullName: `Wallet User ${address.slice(0, 6)}`,
      },
    });
    await logAudit('WALLET_USER_CREATED', 'User', user.id, user.id, { address });
  }

  const accessToken = await generateAccessToken(fastify, {
    id: user.id,
    address,
    role: user.role,
  });

  const refreshToken = await generateRefreshToken(user.id);

  await logAudit('WALLET_LOGIN_SUCCESS', 'User', user.id, user.id, { address });

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