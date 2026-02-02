"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const requireRole = (roles) => {
    return async (request, reply) => {
        if (!request.user) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }
        if (!roles.includes(request.user.role)) {
            return reply.code(403).send({ error: 'Forbidden: Insufficient role' });
        }
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=rbac.js.map