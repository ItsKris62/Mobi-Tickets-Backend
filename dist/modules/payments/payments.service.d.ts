export declare const initiatePayment: (orderId: string, userId: string, method: "MPESA" | "CARD" | "CRYPTO", phoneNumber?: string) => Promise<{
    message: string;
    transactionId: string;
    amount: number;
    method: "MPESA" | "CARD" | "CRYPTO";
    status: string;
}>;
export declare const handleMpesaCallback: (callbackData: {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResultCode: number;
    ResultDesc: string;
    CallbackMetadata?: {
        Item: Array<{
            Name: string;
            Value?: string | number;
        }>;
    };
}) => Promise<{
    message: string;
}>;
export declare const confirmDummyPayment: (transactionId: string, userId: string) => Promise<{
    success: boolean;
    transactionId: string;
    orderId: string;
    amount: number;
}>;
export declare const getPaymentStatus: (transactionId: string, userId: string) => Promise<{
    transactionId: string;
    orderId: string;
    amount: number;
    method: string | null;
    status: string;
    orderStatus: import("@prisma/client").$Enums.OrderStatus;
    createdAt: Date;
    updatedAt: Date;
}>;
//# sourceMappingURL=payments.service.d.ts.map