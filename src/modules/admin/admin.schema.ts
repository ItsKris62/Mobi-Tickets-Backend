// Minimal for now – expand with analytics schemas
import { z } from 'zod';

export const analyticsSchema = z.object({
  query: z.object({
    period: z.enum(['day', 'week', 'month']).optional(),
  }),
});