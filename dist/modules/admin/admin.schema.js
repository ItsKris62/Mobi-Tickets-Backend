"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCancelEventSchema = exports.changeRoleSchema = exports.banToggleSchema = exports.reviewRequestSchema = exports.featureEventSchema = exports.analyticsSchema = void 0;
const zod_1 = require("zod");
exports.analyticsSchema = zod_1.z.object({
    query: zod_1.z.object({
        period: zod_1.z.enum(['day', 'week', 'month']).optional(),
    }),
});
exports.featureEventSchema = zod_1.z.object({
    body: zod_1.z.object({
        featured: zod_1.z.boolean(),
    }),
});
exports.reviewRequestSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['APPROVED', 'REJECTED']),
        notes: zod_1.z.string().optional(),
    }),
});
exports.banToggleSchema = zod_1.z.object({
    body: zod_1.z.object({
        banned: zod_1.z.boolean(),
        reason: zod_1.z.string().optional(),
    }),
});
exports.changeRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        role: zod_1.z.enum(['ATTENDEE', 'ORGANIZER', 'ADMIN']),
    }),
});
exports.adminCancelEventSchema = zod_1.z.object({
    body: zod_1.z.object({
        reason: zod_1.z.string().min(10, 'Please provide a detailed reason for cancellation'),
    }),
});
//# sourceMappingURL=admin.schema.js.map