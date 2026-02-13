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
  ResetPasswordInput,
  LogoutInput,
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
  const {
    email,
    password,
    fullName,
    role = 'ATTENDEE',
    phoneNumber,
    dateOfBirth,
    idNumber,
    county,
    city,
    emergencyContact,
  } = data;

  // Check for existing email
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    throw new Error('Email already registered');
  }

  // Check for existing phone number if provided
  if (phoneNumber) {
    const existingPhone = await prisma.user.findFirst({ where: { phoneNumber } });
    if (existingPhone) {
      throw new Error('Phone number already registered');
    }
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
      role,
      phoneNumber,
      dateOfBirth,
      idNumber,
      county,
      city,
      emergencyContact: emergencyContact ? emergencyContact : undefined,
    },
  });

  await logAudit('USER_REGISTERED', 'User', user.id, user.id, {
    email,
    role,
    phoneNumber: phoneNumber ? '***' + phoneNumber.slice(-4) : undefined, // Mask phone for audit
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

// Register new user and auto-login (returns tokens)
export const registerAndLogin = async (
  data: RegisterInput,
  fastify: FastifyInstance
): Promise<AuthResponse> => {
  // First register the user
  const userResponse = await registerUser(data, fastify);

  // Then generate tokens for auto-login
  const accessToken = await generateAccessToken(fastify, {
    id: userResponse.id,
    email: userResponse.email,
    role: userResponse.role,
  });

  const refreshToken = await generateRefreshToken(userResponse.id);

  await logAudit('USER_AUTO_LOGIN_AFTER_REGISTER', 'User', userResponse.id, userResponse.id, {
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

  // Check if user is active
  if (!user.isActive) {
    throw new Error('Account is deactivated. Please contact support.');
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
      fullName: user.fullName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      phoneNumber: user.phoneNumber ?? undefined,
      isVerified: user.isVerified,
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

  // 2. Check nonce hasn't been used (Upstash Redis with TTL)
  const nonceKey = `wallet_nonce:${nonce}`;
  const nonceExists = await redis.exists(nonceKey);
  if (nonceExists > 0) {
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
  await redis.set(nonceKey, '1', { ex: 600 });

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

// Request password reset (sends token to Redis)
export const requestPasswordReset = async (data: ResetPasswordInput): Promise<{ message: string }> => {
  const { email } = data;

  // Always return success message to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const resetToken = randomBytes(32).toString('hex');
    const redisKey = `pwd_reset:${resetToken}`;

    // Store token in Redis with 1 hour TTL
    await redis.set(redisKey, user.id, { ex: 3600 });

    await logAudit('PASSWORD_RESET_REQUESTED', 'User', user.id, user.id, { email });

    // TODO: Send email with reset link containing the token
    // In production, integrate with email service (e.g., Resend, SendGrid)
  }

  return { message: 'If an account with that email exists, a reset link has been sent.' };
};

// Validate JWT token and return fresh user data
export const validateToken = async (userId: string) => {
  const user = await prisma.user.findUnique({
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

  return {
    valid: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      isVerified: user.isVerified,
      isBanned: user.isBanned,
    },
  };
};

// Logout user by revoking refresh token
export const logoutUser = async (data: LogoutInput, userId: string): Promise<{ message: string }> => {
  const { refreshToken } = data;

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (stored && stored.userId === userId) {
    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { revoked: true },
    });
  }

  await logAudit('USER_LOGOUT', 'User', userId, userId);

  return { message: 'Logged out successfully' };
};