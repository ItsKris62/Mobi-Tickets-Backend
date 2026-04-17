import { z } from 'zod';
export declare const analyticsQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        period: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            "7d": "7d";
            "30d": "30d";
            "90d": "90d";
            "1y": "1y";
        }>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const applySchema: z.ZodObject<{
    body: z.ZodObject<{
        businessName: z.ZodString;
        description: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=organizer.schema.d.ts.map