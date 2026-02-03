// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { envConfig } from '../config/env';

// Prevent multiple instances in dev (hot-reload safety)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPromise: Promise<PrismaClient> | undefined;
};

// Connection timeout in milliseconds
const CONNECTION_TIMEOUT_MS = 10000;

/**
 * Helper to add timeout to a promise
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}

/**
 * Creates and connects the Prisma client with proper timeout and error handling
 */
async function createPrismaClient(): Promise<PrismaClient> {
  // Return cached instance if available
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  console.log('🔌 Connecting to database...');

  try {
    // Create the MariaDB adapter - it's passed directly to PrismaClient
    const adapter = new PrismaMariaDb(envConfig.DATABASE_URL);

    const client = new PrismaClient({
      adapter,
      log: envConfig.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    // Test the connection with a simple query (with timeout)
    await withTimeout(
      client.$queryRaw`SELECT 1`,
      CONNECTION_TIMEOUT_MS,
      `Database connection timed out after ${CONNECTION_TIMEOUT_MS}ms. Check if MariaDB/MySQL is running at: ${envConfig.DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`
    );

    console.log('✅ Database connected successfully');

    // Cache in development to prevent multiple instances on hot-reload
    if (envConfig.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client;
    }

    return client;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    console.error('❌ Database connection failed:', errorMessage);
    throw new Error(`Failed to connect to database: ${errorMessage}`);
  }
}

/**
 * Lazily create the Prisma client promise (not at import time)
 */
export function getPrismaPromise(): Promise<PrismaClient> {
  if (!globalForPrisma.prismaPromise) {
    globalForPrisma.prismaPromise = createPrismaClient();
  }
  return globalForPrisma.prismaPromise;
}

// For backwards compatibility - lazy initialization
export let prisma: PrismaClient;

/**
 * Initialize Prisma client - call this before starting the server
 */
export async function initializePrisma(): Promise<PrismaClient> {
  const client = await getPrismaPromise();
  prisma = client;
  return client;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
  }
});