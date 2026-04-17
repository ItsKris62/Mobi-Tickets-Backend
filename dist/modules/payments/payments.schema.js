"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mpesaCallbackSchema = exports.initiatePaymentSchema = void 0;
const zod_1 = require("zod");
exports.initiatePaymentSchema = zod_1.z.object({
    body: zod_1.z.object({
        orderId: zod_1.z.string().uuid(),
        method: zod_1.z.enum(['MPESA', 'CARD', 'CRYPTO']),
        phoneNumber: zod_1.z.string().optional(),
    }),
});
exports.mpesaCallbackSchema = zod_1.z.object({
    body: zod_1.z.object({
        Body: zod_1.z.object({
            stkCallback: zod_1.z.object({
                MerchantRequestID: zod_1.z.string(),
                CheckoutRequestID: zod_1.z.string(),
                ResultCode: zod_1.z.number(),
                ResultDesc: zod_1.z.string(),
                CallbackMetadata: zod_1.z.object({
                    Item: zod_1.z.array(zod_1.z.object({
                        Name: zod_1.z.string(),
                        Value: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
                    })),
                }).optional(),
            }),
        }),
    }),
});
//# sourceMappingURL=payments.schema.js.map