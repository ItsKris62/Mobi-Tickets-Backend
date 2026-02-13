import { FastifyInstance } from 'fastify';
import { updateProfileSchema, addFavoriteSchema, preferencesSchema } from './users.schema';
import {
  getProfile,
  updateProfile,
  getUserFavorites,
  addFavorite,
  removeFavorite,
  getUserPreferences,
  updateUserPreferences,
} from './users.service';

// Type for profile update data
interface UpdateProfileData {
  fullName?: string;
  bio?: string;
}

export default async (fastify: FastifyInstance) => {
  // Profile
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

  // Favorites
  fastify.get(
    '/me/favorites',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const query = request.query as { page?: string; limit?: string };
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '20', 10);
        const result = await getUserFavorites(request.user.id, page, limit);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  fastify.post(
    '/me/favorites',
    { schema: addFavoriteSchema, preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { eventId } = request.body as { eventId: string };
        const result = await addFavorite(request.user.id, eventId);
        reply.status(201).send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  fastify.delete(
    '/me/favorites/:eventId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { eventId } = request.params as { eventId: string };
        const result = await removeFavorite(request.user.id, eventId);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // Preferences
  fastify.get(
    '/me/preferences',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const prefs = await getUserPreferences(request.user.id);
        reply.send(prefs);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: errorMessage });
      }
    }
  );

  fastify.patch(
    '/me/preferences',
    { schema: preferencesSchema, preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const data = request.body as { notifications?: boolean; language?: string; theme?: string };
        const updated = await updateUserPreferences(request.user.id, data);
        reply.send(updated);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(400).send({ error: errorMessage });
      }
    }
  );
};