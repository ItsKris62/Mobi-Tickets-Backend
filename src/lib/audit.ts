// src/lib/audit.ts – Immutable audit trail for CIA Integrity
import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';

export const logAudit = async (
  action: string,
  entity: string,
  entityId: string | null = null,
  userId: string | null = null,
  data: unknown = null,
  request?: FastifyRequest
) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userId,
        data: data ? JSON.stringify(data) : Prisma.DbNull,
        ipAddress: request?.ip,
      },
    });
  } catch (err) {
    console.error('Audit log failed:', err); // Fallback: never block main flow
  }
};