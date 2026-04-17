import { z } from 'zod';
export declare const initiatePaymentSchema: z.ZodObject<{
    body: z.ZodObject<{
        orderId: z.ZodString;
        method: z.ZodEnum<{
            MPESA: "MPESA";
            CARD: "CARD";
            CRYPTO: "CRYPTO";
        }>;
        phoneNumber: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const mpesaCallbackSchema: z.ZodObject<{
    body: z.ZodObject<{
        Body: z.ZodObject<{
            stkCallback: z.ZodObject<{
                MerchantRequestID: z.ZodString;
                CheckoutRequestID: z.ZodString;
                ResultCode: z.ZodNumber;
                ResultDesc: z.ZodString;
                CallbackMetadata: z.ZodOptional<z.ZodObject<{
                    Item: z.ZodArray<z.ZodObject<{
                        Name: z.ZodString;
                        Value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>>;
            }, z.core.$strip>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=payments.schema.d.ts.map