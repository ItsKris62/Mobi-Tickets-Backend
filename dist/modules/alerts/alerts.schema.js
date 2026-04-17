"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAlertsSchema = exports.createAlertSchema = void 0;
const zod_1 = require("zod");
exports.createAlertSchema = zod_1.z.object({
    body: zod_1.z.object({
        type: zod_1.z.enum(['security', 'system', 'user', 'payment', 'event']),
        severity: zod_1.z.enum(['critical', 'high', 'medium', 'low']),
        title: zod_1.z.string().min(1),
        message: zod_1.z.string().min(1),
        source: zod_1.z.string().optional(),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    }),
});
exports.listAlertsSchema = zod_1.z.object({
    querystring: zod_1.z.object({
        type: zod_1.z.enum(['security', 'system', 'user', 'payment', 'event']).optional(),
        severity: zod_1.z.enum(['critical', 'high', 'medium', 'low']).optional(),
        status: zod_1.z.enum(['active', 'acknowledged', 'resolved']).optional(),
        page: zod_1.z.coerce.number().int().positive().optional().default(1),
        limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    }),
});
//# sourceMappingURL=alerts.schema.js.map