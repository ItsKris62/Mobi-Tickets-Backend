import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime().optional(),
    location: z.object({ venue: z.string(), address: z.string() }).optional(),
  }),
});

export const updateEventSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: createEventSchema.shape.body.partial(),
});

export type CreateEventInput = z.infer<typeof createEventSchema.shape.body>;