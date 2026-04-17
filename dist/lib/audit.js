"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = void 0;
const prisma_1 = require("./prisma");
const client_1 = require("@prisma/client");
const logAudit = async (action, entity, entityId = null, userId = null, data = null, request) => {
    try {
        await prisma_1.prisma.auditLog.create({
            data: {
                action,
                entity,
                entityId,
                userId,
                data: data ?? client_1.Prisma.DbNull,
                ipAddress: request?.ip,
            },
        });
    }
    catch (err) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Audit log failed:', err);
        }
    }
};
exports.logAudit = logAudit;
//# sourceMappingURL=audit.js.map