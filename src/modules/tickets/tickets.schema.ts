import { z } from 'zod';

export const purchaseTicketSchema = z.object({
  body: z.object({
    ticketId: z.string().uuid(),
    quantity: z.number().int().min(1),
  }),
});