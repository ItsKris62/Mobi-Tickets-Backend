"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fastify_plugin_1 = tslib_1.__importDefault(require("fastify-plugin"));
const authPlugin = async (fastify) => {
    fastify.decorate('authenticate', async (request, reply) => {
        try {
            const token = request.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                reply.code(401).send({ error: 'No token provided' });
                return;
            }
            const decoded = await request.jwtVerify();
            if (!decoded ||
                typeof decoded !== 'object' ||
                !('id' in decoded) ||
                !('role' in decoded)) {
                reply.code(401).send({ error: 'Invalid token payload' });
                return;
            }
            request.user = decoded;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            fastify.log.error({ err }, 'JWT verification failed');
            reply.code(401).send({ error: 'Invalid or expired token' });
            return;
        }
    });
};
exports.default = (0, fastify_plugin_1.default)(authPlugin, {
    name: 'auth-plugin',
    fastify: '5.x',
});
//# sourceMappingURL=auth.js.map