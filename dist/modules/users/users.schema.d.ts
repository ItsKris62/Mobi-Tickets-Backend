import { z } from 'zod';
export declare const updateProfileSchema: z.ZodObject<{
    body: z.ZodObject<{
        fullName: z.ZodOptional<z.ZodString>;
        bio: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const addFavoriteSchema: z.ZodObject<{
    body: z.ZodObject<{
        eventId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const preferencesSchema: z.ZodObject<{
    body: z.ZodObject<{
        notifications: z.ZodOptional<z.ZodBoolean>;
        language: z.ZodOptional<z.ZodString>;
        theme: z.ZodOptional<z.ZodEnum<{
            system: "system";
            light: "light";
            dark: "dark";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=users.schema.d.ts.map