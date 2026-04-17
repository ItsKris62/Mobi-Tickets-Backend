"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTicketSchema = exports.transferTicketSchema = exports.refundRequestSchema = exports.purchaseTicketSchema = void 0;
const zod_1 = require("zod");
exports.purchaseTicketSchema = zod_1.z.object({
    body: zod_1.z.object({
        ticketId: zod_1.z.string().uuid(),
        quantity: zod_1.z.number().int().min(1),
    }),
});
exports.refundRequestSchema = zod_1.z.object({
    body: zod_1.z.object({
        orderId: zod_1.z.string().uuid(),
        reason: zod_1.z.string().min(10, 'Please provide a detailed reason for the refund'),
    }),
});
exports.transferTicketSchema = zod_1.z.object({
    body: zod_1.z.object({
        recipientEmail: zod_1.z.string().email('Invalid recipient email'),
    }),
});
exports.validateTicketSchema = zod_1.z.object({
    body: zod_1.z.object({
        qrData: zod_1.z.string().min(1, 'QR data is required'),
    }),
});
//# sourceMappingURL=tickets.schema.js.map