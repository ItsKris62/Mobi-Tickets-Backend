"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySchema = exports.analyticsQuerySchema = void 0;
const zod_1 = require("zod");
exports.analyticsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        period: zod_1.z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
    }),
});
exports.applySchema = zod_1.z.object({
    body: zod_1.z.object({
        businessName: zod_1.z.string().min(2, 'Business name is required'),
        description: zod_1.z.string().min(20, 'Please provide a detailed description (min 20 characters)'),
    }),
});
//# sourceMappingURL=organizer.schema.js.map