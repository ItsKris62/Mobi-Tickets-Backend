// src/middleware/auth.ts – Type-safe JWT authentication decorator
import { FastifyReply, FastifyRequest, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorator for protected routes
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          reply.code(401).send({ error: 'No token provided' });
          return;
        }

        // Verify JWT and attach to request
        const decoded = await request.jwtVerify();

        // Runtime safety check for token payload structure
        if (
          !decoded ||
          typeof decoded !== 'object' ||
          !('id' in decoded) ||
          !('role' in decoded)
        ) {
          reply.code(401).send({ error: 'Invalid token payload' });
          return;
        }

        // TypeScript knows the shape from our augmentation
        request.user = decoded as {
          id: string;
          email: string;
          role: string;
          address?: string;
        };
      } catch (err) {
        fastify.log.error({ err }, 'JWT verification failed');
        reply.code(401).send({ error: 'Invalid or expired token' });
        return;
      }
    }
  );
};

export default fp(authPlugin, {
  name: 'auth-plugin',
  fastify: '5.x',
});