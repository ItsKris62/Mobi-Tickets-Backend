export declare const purchaseTickets: (userId: string, ticketId: string, quantity: number) => Promise<{
    order: any;
    qrCode: string;
}>;
export declare const getUserTickets: (userId: string) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    eventId: string;
    totalAmount: number;
    status: import(".prisma/client").$Enums.OrderStatus;
}[]>;
export declare const getTicketQR: (orderId: string, userId: string) => Promise<{
    qrCode: string;
    orderId: string;
}>;
export declare const generateTicketQR: (ticketId: string, orderId: string) => Promise<string>;
//# sourceMappingURL=tickets.service.d.ts.map