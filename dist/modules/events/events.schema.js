"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEventSchema = exports.createEventSchema = void 0;
const zod_1 = require("zod");
exports.createEventSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3),
        description: zod_1.z.string().optional(),
        startTime: zod_1.z.string().datetime(),
        endTime: zod_1.z.string().datetime().optional(),
        location: zod_1.z.object({ venue: zod_1.z.string(), address: zod_1.z.string() }).optional(),
    }),
});
exports.updateEventSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
    body: exports.createEventSchema.shape.body.partial(),
});
//# sourceMappingURL=events.schema.js.map