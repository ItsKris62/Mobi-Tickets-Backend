"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsSchema = void 0;
const zod_1 = require("zod");
exports.analyticsSchema = zod_1.z.object({
    query: zod_1.z.object({
        period: zod_1.z.enum(['day', 'week', 'month']).optional(),
    }),
});
//# sourceMappingURL=admin.schema.js.map