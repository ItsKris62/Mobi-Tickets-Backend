"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAttendeesSchema = exports.topEventsSchema = exports.eventDetailedAnalyticsSchema = exports.eventPerformanceSchema = exports.revenueTimeSeriesSchema = exports.organizerSummarySchema = void 0;
const zod_1 = require("zod");
exports.organizerSummarySchema = {
    querystring: zod_1.z.object({
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional(),
    }),
};
exports.revenueTimeSeriesSchema = {
    querystring: zod_1.z.object({
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional(),
        interval: zod_1.z.enum(['daily', 'weekly', 'monthly']).default('daily'),
    }),
};
exports.eventPerformanceSchema = {
    querystring: zod_1.z.object({
        status: zod_1.z.string().optional(),
        sortBy: zod_1.z.enum(['revenue', 'ticketsSold', 'occupancyRate', 'checkInRate']).default('revenue'),
        order: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
};
exports.eventDetailedAnalyticsSchema = {
    params: zod_1.z.object({
        eventId: zod_1.z.string().uuid(),
    }),
};
exports.topEventsSchema = {
    querystring: zod_1.z.object({
        limit: zod_1.z.coerce.number().int().min(1).max(10).default(5),
    }),
};
exports.exportAttendeesSchema = {
    params: zod_1.z.object({
        eventId: zod_1.z.string().uuid(),
    }),
};
//# sourceMappingURL=analytics.schema.js.map