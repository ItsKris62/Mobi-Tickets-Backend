// src/middleware/rbac.ts – No changes needed, error gone
import { FastifyReply, FastifyRequest } from 'fastify';

export const requireRole = (roles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: 'Forbidden: Insufficient role' });
    }
  };
};