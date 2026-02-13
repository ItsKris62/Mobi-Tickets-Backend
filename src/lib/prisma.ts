// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { envConfig } from '../config/env';

// Prevent multiple instances during hot reload (dev mode)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPromise: Promise<PrismaClient> | undefined;
};

// Connection timeout
const CONNECTION_TIMEOUT_MS = 10000;

/**
 * Add timeout to a promise
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}

/**
 * Create Prisma Client (Prisma 7 compatible)
 */
async function createPrismaClient(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  console.log('🔌 Connecting to database...');

  try {
    if (!envConfig.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined');
    }

    // Create pg pool
    const pool = new Pool({
      connectionString: envConfig.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for Supabase
      },
    });

    // Create Prisma adapter
    const adapter = new PrismaPg(pool);

    // Create Prisma client
    const client = new PrismaClient({
      adapter,
      log:
        envConfig.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });

    // Test connection
    await withTimeout(
      client.$queryRaw`SELECT 1`,
      CONNECTION_TIMEOUT_MS,
      `Database connection timed out after ${CONNECTION_TIMEOUT_MS}ms`
    );

    console.log('✅ Database connected successfully');

    if (envConfig.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client;
    }

    return client;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown database error';

    console.error('❌ Database connection failed:', errorMessage);
    throw new Error(`Failed to connect to database: ${errorMessage}`);
  }
}

/**
 * Lazy initialization
 */
export function getPrismaPromise(): Promise<PrismaClient> {
  if (!globalForPrisma.prismaPromise) {
    globalForPrisma.prismaPromise = createPrismaClient();
  }
  return globalForPrisma.prismaPromise;
}

// Exported instance (after initialization)
export let prisma: PrismaClient;

/**
 * Initialize Prisma (call before server start)
 */
export async function initializePrisma(): Promise<PrismaClient> {
  const client = await getPrismaPromise();
  prisma = client;
  return client;
}

/**
 * Graceful shutdown
 */
process.on('beforeExit', async () => {
  if (globalForPrisma.prisma) {
    console.log('🔌 Disconnecting Prisma...');
    await globalForPrisma.prisma.$disconnect();
  }
});