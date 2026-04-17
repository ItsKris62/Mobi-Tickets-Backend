import { z } from 'zod';

export const organizerSummarySchema = {
  querystring: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};

export const revenueTimeSeriesSchema = {
  querystring: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    interval: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  }),
};

export const eventPerformanceSchema = {
  querystring: z.object({
    status: z.string().optional(),
    sortBy: z.enum(['revenue', 'ticketsSold', 'occupancyRate', 'checkInRate']).default('revenue'),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
};

export const eventDetailedAnalyticsSchema = {
  params: z.object({
    eventId: z.string().uuid(),
  }),
};

export const topEventsSchema = {
  querystring: z.object({
    limit: z.coerce.number().int().min(1).max(10).default(5),
  }),
};

export const exportAttendeesSchema = {
  params: z.object({
    eventId: z.string().uuid(),
  }),
};