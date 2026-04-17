import { z } from 'zod';
export declare const purchaseTicketSchema: z.ZodObject<{
    body: z.ZodObject<{
        ticketId: z.ZodString;
        quantity: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const refundRequestSchema: z.ZodObject<{
    body: z.ZodObject<{
        orderId: z.ZodString;
        reason: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const transferTicketSchema: z.ZodObject<{
    body: z.ZodObject<{
        recipientEmail: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const validateTicketSchema: z.ZodObject<{
    body: z.ZodObject<{
        qrData: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=tickets.schema.d.ts.map