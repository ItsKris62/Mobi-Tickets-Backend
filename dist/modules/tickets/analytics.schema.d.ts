import { z } from 'zod';
export declare const organizerSummarySchema: {
    querystring: z.ZodObject<{
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
};
export declare const revenueTimeSeriesSchema: {
    querystring: z.ZodObject<{
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        interval: z.ZodDefault<z.ZodEnum<{
            daily: "daily";
            weekly: "weekly";
            monthly: "monthly";
        }>>;
    }, z.core.$strip>;
};
export declare const eventPerformanceSchema: {
    querystring: z.ZodObject<{
        status: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodEnum<{
            revenue: "revenue";
            ticketsSold: "ticketsSold";
            occupancyRate: "occupancyRate";
            checkInRate: "checkInRate";
        }>>;
        order: z.ZodDefault<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
    }, z.core.$strip>;
};
export declare const eventDetailedAnalyticsSchema: {
    params: z.ZodObject<{
        eventId: z.ZodString;
    }, z.core.$strip>;
};
export declare const topEventsSchema: {
    querystring: z.ZodObject<{
        limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    }, z.core.$strip>;
};
export declare const exportAttendeesSchema: {
    params: z.ZodObject<{
        eventId: z.ZodString;
    }, z.core.$strip>;
};
//# sourceMappingURL=analytics.schema.d.ts.map