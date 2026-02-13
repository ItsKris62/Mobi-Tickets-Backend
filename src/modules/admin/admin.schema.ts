import { z } from 'zod';

export const analyticsSchema = z.object({
  query: z.object({
    period: z.enum(['day', 'week', 'month']).optional(),
  }),
});

export const featureEventSchema = z.object({
  body: z.object({
    featured: z.boolean(),
  }),
});

export const reviewRequestSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    notes: z.string().optional(),
  }),
});