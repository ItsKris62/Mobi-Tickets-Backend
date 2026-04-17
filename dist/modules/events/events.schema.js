"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventsQuerySchema = exports.updateEventSchema = exports.createEventSchema = exports.EventCategoryEnum = void 0;
const zod_1 = require("zod");
exports.EventCategoryEnum = zod_1.z.enum([
    'MUSIC',
    'SPORTS',
    'CONFERENCE',
    'THEATER',
    'FESTIVAL',
    'COMEDY',
    'EXHIBITION',
    'WORKSHOP',
    'OTHER',
]);
exports.createEventSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3, 'Title must be at least 3 characters'),
        description: zod_1.z.string().optional(),
        startTime: zod_1.z.string().datetime(),
        endTime: zod_1.z.string().datetime().optional(),
        location: zod_1.z.preprocess((val) => {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                }
                catch {
                    return val;
                }
            }
            return val;
        }, zod_1.z.object({ venue: zod_1.z.string(), address: zod_1.z.string() }).optional()),
        county: zod_1.z.string().min(1, 'County is required').max(100),
        category: exports.EventCategoryEnum.default('OTHER'),
        maxCapacity: zod_1.z.preprocess((val) => (typeof val === 'string' ? Number(val) : val), zod_1.z.number().int().positive().optional()),
        posterUrl: zod_1.z.string().url().optional(),
        tickets: zod_1.z.preprocess((val) => {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                }
                catch {
                    return val;
                }
            }
            return val;
        }, zod_1.z
            .array(zod_1.z.object({
            name: zod_1.z.string().min(1),
            category: zod_1.z.enum(['REGULAR', 'VIP', 'VVIP']),
            price: zod_1.z.preprocess((v) => (typeof v === 'string' ? Number(v) : v), zod_1.z.number().nonnegative()),
            quantity: zod_1.z.preprocess((v) => (typeof v === 'string' ? Number(v) : v), zod_1.z.number().int().nonnegative()),
        }))
            .optional()
            .transform((v) => v)).optional(),
    }),
});
exports.updateEventSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
    body: exports.createEventSchema.shape.body.partial(),
});
exports.getEventsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(12),
    search: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    county: zod_1.z.string().optional(),
    featured: zod_1.z.enum(['true', 'false']).optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    sortBy: zod_1.z.enum(['startTime', 'createdAt', 'publishedAt', 'title']).default('publishedAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
//# sourceMappingURL=events.schema.js.map