import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  query: z.object({
    period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  }),
});

export const applySchema = z.object({
  body: z.object({
    businessName: z.string().min(2, 'Business name is required'),
    description: z.string().min(20, 'Please provide a detailed description (min 20 characters)'),
  }),
});
