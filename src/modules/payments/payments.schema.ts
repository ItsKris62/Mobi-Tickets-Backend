import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
    method: z.enum(['MPESA', 'CARD', 'CRYPTO']),
    phoneNumber: z.string().optional(), // Required for M-Pesa
  }),
});

export const mpesaCallbackSchema = z.object({
  body: z.object({
    Body: z.object({
      stkCallback: z.object({
        MerchantRequestID: z.string(),
        CheckoutRequestID: z.string(),
        ResultCode: z.number(),
        ResultDesc: z.string(),
        CallbackMetadata: z.object({
          Item: z.array(z.object({
            Name: z.string(),
            Value: z.union([z.string(), z.number()]).optional(),
          })),
        }).optional(),
      }),
    }),
  }),
});
