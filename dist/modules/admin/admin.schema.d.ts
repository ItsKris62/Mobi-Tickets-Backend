import { z } from 'zod';
export declare const analyticsSchema: z.ZodObject<{
    query: z.ZodObject<{
        period: z.ZodOptional<z.ZodEnum<{
            month: "month";
            day: "day";
            week: "week";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const featureEventSchema: z.ZodObject<{
    body: z.ZodObject<{
        featured: z.ZodBoolean;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const reviewRequestSchema: z.ZodObject<{
    body: z.ZodObject<{
        status: z.ZodEnum<{
            REJECTED: "REJECTED";
            APPROVED: "APPROVED";
        }>;
        notes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const banToggleSchema: z.ZodObject<{
    body: z.ZodObject<{
        banned: z.ZodBoolean;
        reason: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const changeRoleSchema: z.ZodObject<{
    body: z.ZodObject<{
        role: z.ZodEnum<{
            ATTENDEE: "ATTENDEE";
            ORGANIZER: "ORGANIZER";
            ADMIN: "ADMIN";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const adminCancelEventSchema: z.ZodObject<{
    body: z.ZodObject<{
        reason: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=admin.schema.d.ts.map