export declare function computeEventAnalytics(eventId: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    eventId: string;
    totalTicketsSold: number;
    totalRevenue: number;
    totalCapacity: number;
    totalCheckIns: number;
    ticketsByType: import("@prisma/client/runtime/client").JsonValue;
    salesByDay: import("@prisma/client/runtime/client").JsonValue;
    lastUpdated: Date;
}>;
//# sourceMappingURL=analytics.d.ts.map