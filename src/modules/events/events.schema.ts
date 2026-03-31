import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime().optional(),
    location: z.object({ venue: z.string(), address: z.string() }).optional(),
    county: z.string().min(1, 'County is required').max(100),
    category: z.string().optional(),
    maxCapacity: z.number().int().positive().optional(),
  }),
});

export const updateEventSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: createEventSchema.shape.body.partial(),
});

export const getEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().optional(),
  category: z.string().optional(),
  county: z.string().optional(),
  featured: z.enum(['true', 'false']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['startTime', 'createdAt', 'title']).default('startTime'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateEventInput = z.infer<typeof createEventSchema.shape.body>;
export type GetEventsQuery = z.infer<typeof getEventsQuerySchema>;
