import { z } from 'zod';
export declare const createEventSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        startTime: z.ZodString;
        endTime: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodObject<{
            venue: z.ZodString;
            address: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateEventSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        startTime: z.ZodOptional<z.ZodString>;
        endTime: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        location: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            venue: z.ZodString;
            address: z.ZodString;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreateEventInput = z.infer<typeof createEventSchema.shape.body>;
//# sourceMappingURL=events.schema.d.ts.map