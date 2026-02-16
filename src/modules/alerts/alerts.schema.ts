import { z } from 'zod';

export const createAlertSchema = z.object({
  body: z.object({
    type: z.enum(['security', 'system', 'user', 'payment', 'event']),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    title: z.string().min(1),
    message: z.string().min(1),
    source: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

export const listAlertsSchema = z.object({
  querystring: z.object({
    type: z.enum(['security', 'system', 'user', 'payment', 'event']).optional(),
    severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    status: z.enum(['active', 'acknowledged', 'resolved']).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});
