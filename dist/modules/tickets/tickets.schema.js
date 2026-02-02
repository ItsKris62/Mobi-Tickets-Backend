"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseTicketSchema = void 0;
const zod_1 = require("zod");
exports.purchaseTicketSchema = zod_1.z.object({
    body: zod_1.z.object({
        ticketId: zod_1.z.string().uuid(),
        quantity: zod_1.z.number().int().min(1),
    }),
});
//# sourceMappingURL=tickets.schema.js.map