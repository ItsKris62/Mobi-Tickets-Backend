import { z } from 'zod';
export declare const analyticsSchema: z.ZodObject<{
    query: z.ZodObject<{
        period: z.ZodOptional<z.ZodEnum<{
            day: "day";
            week: "week";
            month: "month";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=admin.schema.d.ts.map