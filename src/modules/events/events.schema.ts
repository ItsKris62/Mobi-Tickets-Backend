import { z } from 'zod';

// EventCategory enum — must match Prisma schema exactly
export const EventCategoryEnum = z.enum([
  'MUSIC',
  'SPORTS',
  'CONFERENCE',
  'THEATER',
  'FESTIVAL',
  'COMEDY',
  'EXHIBITION',
  'WORKSHOP',
  'OTHER',
]);

export type EventCategory = z.infer<typeof EventCategoryEnum>;

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime().optional(),
    // multipart form fields often arrive as JSON strings
    location: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          try {
            return JSON.parse(val)
          } catch {
            return val
          }
        }
        return val
      },
      z.object({ venue: z.string(), address: z.string() }).optional()
    ),
    county: z.string().min(1, 'County is required').max(100),
    category: EventCategoryEnum.default('OTHER'),
    maxCapacity: z.preprocess(
      (val) => (typeof val === 'string' ? Number(val) : val),
      z.number().int().positive().optional()
    ),
    // Optional poster URL (used by JSON-only create flows that don't upload multipart files)
    posterUrl: z.string().url().optional(),

    // Ticket tiers (used so publish + attendee booking can work)
    tickets: z.preprocess(
      (val) => {
        // When using multipart/form-data, complex objects often arrive as JSON strings.
        if (typeof val === 'string') {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      },
      z
        .array(
          z.object({
            name: z.string().min(1),
            // Must match Prisma TicketCategory enum values
            category: z.enum(['REGULAR', 'VIP', 'VVIP']),
            price: z.preprocess(
              (v) => (typeof v === 'string' ? Number(v) : v),
              z.number().nonnegative()
            ),
            quantity: z.preprocess(
              (v) => (typeof v === 'string' ? Number(v) : v),
              z.number().int().nonnegative()
            ),
          })
        )
        .optional()
        .transform((v) => v)
    ).optional(),
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
  // Support comma-separated categories: ?category=MUSIC,SPORTS
  category: z.string().optional(),
  county: z.string().optional(),
  featured: z.enum(['true', 'false']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['startTime', 'createdAt', 'publishedAt', 'title']).default('publishedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateEventInput = z.infer<typeof createEventSchema.shape.body>;
export type GetEventsQuery = z.infer<typeof getEventsQuerySchema>;
