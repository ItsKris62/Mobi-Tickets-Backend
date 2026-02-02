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
};
//# sourceMappingURL=users.routes.js.map