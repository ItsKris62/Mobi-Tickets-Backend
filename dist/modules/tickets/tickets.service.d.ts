export declare const purchaseTickets: (userId: string, ticketId: string, quantity: number) => Promise<{
    order: any;
    qrCode: any;
} | undefined>;
export declare const getUserTickets: (userId: string) => Promise<({
    event: {
        id: string;
        title: string;
        startTime: Date;
        endTime: Date | null;
        location: import("@prisma/client/runtime/client").JsonValue;
        posterUrl: string | null;
    };
    items: ({
        ticket: {
            name: string;
            id: string;
            category: import("@prisma/client").$Enums.TicketCategory;
            price: number;
        };
    } & {
        id: string;
        orderId: string;
        ticketId: string;
        quantity: number;
        priceAtTime: number;
    })[];
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import("@prisma/client").$Enums.OrderStatus;
    userId: string;
    eventId: string;
    totalAmount: number;
})[]>;
export declare const getTicketQR: (orderId: string, userId: string) => Promise<{
    qrCode: any;
    orderId: string;
}>;
export declare const requestRefund: (orderId: string, userId: string, reason: string) => Promise<{
    message: string;
    refundRequestId: string;
}>;
export declare const transferTicket: (ticketPurchaseId: string, userId: string, recipientEmail: string) => Promise<{
    message: string;
    recipientId: string;
}>;
export declare const validateTicket: (qrData: string) => Promise<{
    valid: boolean;
    message: string;
    ticket?: undefined;
} | {
    valid: boolean;
    message: string;
    ticket: {
        ticketNumber: string;
        attendeeName: string | null;
        ticketType: string;
        eventTitle: string;
        status: string;
        checkedInAt: Date | null;
    };
}>;
//# sourceMappingURL=tickets.service.d.ts.map