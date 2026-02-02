"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = void 0;
const prisma_1 = require("./prisma");
const logAudit = async (action, entity, entityId = null, userId = null, data = null, request) => {
    try {
        await prisma_1.prisma.auditLog.create({
            data: {
                action,
                entity,
                entityId,
                userId,
                data: data ? JSON.stringify(data) : null,
                ipAddress: request?.ip,
            },
        });
    }
    catch (err) {
        console.error('Audit log failed:', err);
    }
};
exports.logAudit = logAudit;
//# sourceMappingURL=audit.js.map