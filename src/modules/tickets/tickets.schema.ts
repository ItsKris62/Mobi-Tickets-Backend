import { z } from 'zod';

export const purchaseTicketSchema = z.object({
  body: z.object({
    ticketId: z.string().uuid(),
    quantity: z.number().int().min(1),
  }),
});

export const refundRequestSchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
    reason: z.string().min(10, 'Please provide a detailed reason for the refund'),
  }),
});

export const transferTicketSchema = z.object({
  body: z.object({
    recipientEmail: z.string().email('Invalid recipient email'),
  }),
});

export const validateTicketSchema = z.object({
  body: z.object({
    qrData: z.string().min(1, 'QR data is required'),
  }),
});