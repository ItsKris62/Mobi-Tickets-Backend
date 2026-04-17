import { z } from 'zod';
export declare const EventCategoryEnum: z.ZodEnum<{
    MUSIC: "MUSIC";
    SPORTS: "SPORTS";
    CONFERENCE: "CONFERENCE";
    THEATER: "THEATER";
    FESTIVAL: "FESTIVAL";
    COMEDY: "COMEDY";
    EXHIBITION: "EXHIBITION";
    WORKSHOP: "WORKSHOP";
    OTHER: "OTHER";
}>;
export type EventCategory = z.infer<typeof EventCategoryEnum>;
export declare const createEventSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        startTime: z.ZodString;
        endTime: z.ZodOptional<z.ZodString>;
        location: z.ZodPipe<z.ZodTransform<any, unknown>, z.ZodOptional<z.ZodObject<{
            venue: z.ZodString;
            address: z.ZodString;
        }, z.core.$strip>>>;
        county: z.ZodString;
        category: z.ZodDefault<z.ZodEnum<{
            MUSIC: "MUSIC";
            SPORTS: "SPORTS";
            CONFERENCE: "CONFERENCE";
            THEATER: "THEATER";
            FESTIVAL: "FESTIVAL";
            COMEDY: "COMEDY";
            EXHIBITION: "EXHIBITION";
            WORKSHOP: "WORKSHOP";
            OTHER: "OTHER";
        }>>;
        maxCapacity: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>;
        posterUrl: z.ZodOptional<z.ZodString>;
        tickets: z.ZodOptional<z.ZodPipe<z.ZodTransform<any, unknown>, z.ZodPipe<z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            category: z.ZodEnum<{
                REGULAR: "REGULAR";
                VIP: "VIP";
                VVIP: "VVIP";
            }>;
            price: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>;
            quantity: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>;
        }, z.core.$strip>>>, z.ZodTransform<{
            name: string;
            category: "REGULAR" | "VIP" | "VVIP";
            price: number;
            quantity: number;
        }[] | undefined, {
            name: string;
            category: "REGULAR" | "VIP" | "VVIP";
            price: number;
            quantity: number;
        }[] | undefined>>>>;
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
        location: z.ZodOptional<z.ZodPipe<z.ZodTransform<any, unknown>, z.ZodOptional<z.ZodObject<{
            venue: z.ZodString;
            address: z.ZodString;
        }, z.core.$strip>>>>;
        county: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
            MUSIC: "MUSIC";
            SPORTS: "SPORTS";
            CONFERENCE: "CONFERENCE";
            THEATER: "THEATER";
            FESTIVAL: "FESTIVAL";
            COMEDY: "COMEDY";
            EXHIBITION: "EXHIBITION";
            WORKSHOP: "WORKSHOP";
            OTHER: "OTHER";
        }>>>;
        maxCapacity: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        posterUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        tickets: z.ZodOptional<z.ZodOptional<z.ZodPipe<z.ZodTransform<any, unknown>, z.ZodPipe<z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            category: z.ZodEnum<{
                REGULAR: "REGULAR";
                VIP: "VIP";
                VVIP: "VVIP";
            }>;
            price: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>;
            quantity: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>;
        }, z.core.$strip>>>, z.ZodTransform<{
            name: string;
            category: "REGULAR" | "VIP" | "VVIP";
            price: number;
            quantity: number;
        }[] | undefined, {
            name: string;
            category: "REGULAR" | "VIP" | "VVIP";
            price: number;
            quantity: number;
        }[] | undefined>>>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getEventsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    search: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    county: z.ZodOptional<z.ZodString>;
    featured: z.ZodOptional<z.ZodEnum<{
        true: "true";
        false: "false";
    }>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodEnum<{
        createdAt: "createdAt";
        title: "title";
        startTime: "startTime";
        publishedAt: "publishedAt";
    }>>;
    sortOrder: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
}, z.core.$strip>;
export type CreateEventInput = z.infer<typeof createEventSchema.shape.body>;
export type GetEventsQuery = z.infer<typeof getEventsQuerySchema>;
//# sourceMappingURL=events.schema.d.ts.map