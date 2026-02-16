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

// New schemas for additional admin endpoints

export const banToggleSchema = z.object({
  body: z.object({
    banned: z.boolean(),
    reason: z.string().optional(),
  }),
});

export const changeRoleSchema = z.object({
  body: z.object({
    role: z.enum(['ATTENDEE', 'ORGANIZER', 'ADMIN']),
  }),
});

export const adminCancelEventSchema = z.object({
  body: z.object({
    reason: z.string().min(10, 'Please provide a detailed reason for cancellation'),
  }),
});