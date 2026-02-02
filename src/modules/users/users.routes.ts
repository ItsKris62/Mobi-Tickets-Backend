import { FastifyInstance } from 'fastify';
import { updateProfileSchema } from './users.schema';
import { getProfile, updateProfile } from './users.service';

// Type for profile update data
interface UpdateProfileData {
  fullName?: string;
  bio?: string;
}

export default async (fastify: FastifyInstance) => {
  fastify.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const profile = await getProfile(request.user.id);
      reply.send(profile);
    }
  );

  fastify.patch(
    '/me',
    { schema: updateProfileSchema, preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const data = request.body as UpdateProfileData;
      const updated = await updateProfile(request.user.id, data);
      reply.send(updated);
    }
  );
};