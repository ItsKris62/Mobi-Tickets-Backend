"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const users_schema_1 = require("./users.schema");
const users_service_1 = require("./users.service");
exports.default = async (fastify) => {
    fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const profile = await (0, users_service_1.getProfile)(request.user.id);
        reply.send(profile);
    });
    fastify.patch('/me', { schema: users_schema_1.updateProfileSchema, preHandler: [fastify.authenticate] }, async (request, reply) => {
        const data = request.body;
        const updated = await (0, users_service_1.updateProfile)(request.user.id, data);
        reply.send(updated);
    });
    fastify.post('/me/avatar', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const file = await request.file();
            if (!file) {
                return reply.status(400).send({ error: 'No file uploaded' });
            }
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.mimetype)) {
                return reply.status(400).send({ error: 'Invalid file type. Allowed: jpg, png, webp' });
            }
            const updated = await (0, users_service_1.updateAvatar)(request.user.id, file);
            reply.send(updated);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
    fastify.get('/me/favorites', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const query = request.query;
            const page = parseInt(query.page || '1', 10);
            const limit = parseInt(query.limit || '20', 10);
            const result = await (0, users_service_1.getUserFavorites)(request.user.id, page, limit);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.post('/me/favorites', { schema: users_schema_1.addFavoriteSchema, preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const { eventId } = request.body;
            const result = await (0, users_service_1.addFavorite)(request.user.id, eventId);
            reply.status(201).send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
    fastify.delete('/me/favorites/:eventId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const { eventId } = request.params;
            const result = await (0, users_service_1.removeFavorite)(request.user.id, eventId);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('not found') ? 404 : 400;
            reply.status(statusCode).send({ error: errorMessage });
        }
    });
    fastify.get('/me/preferences', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const prefs = await (0, users_service_1.getUserPreferences)(request.user.id);
            reply.send(prefs);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(500).send({ error: errorMessage });
        }
    });
    fastify.patch('/me/preferences', { schema: users_schema_1.preferencesSchema, preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const data = request.body;
            const updated = await (0, users_service_1.updateUserPreferences)(request.user.id, data);
            reply.send(updated);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.status(400).send({ error: errorMessage });
        }
    });
};
//# sourceMappingURL=users.routes.js.map