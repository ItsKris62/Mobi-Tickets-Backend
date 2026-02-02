import { z } from 'zod';
export declare const purchaseTicketSchema: z.ZodObject<{
    body: z.ZodObject<{
        ticketId: z.ZodString;
        quantity: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=tickets.schema.d.ts.map