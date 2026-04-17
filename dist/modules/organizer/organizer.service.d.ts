export declare const getOrganizerAnalytics: (organizerId: string, period: string) => Promise<{
    period: string;
    totalEvents: number;
    totalTicketsSold: number;
    totalRevenue: number;
    activeUsers: number;
    revenueByEvent: {
        eventId: string;
        eventTitle: string;
        revenue: number;
        orders: number;
    }[];
    revenueByMonth: {
        month: string;
        revenue: number;
    }[];
    ticketsByCategory: {
        category: string;
        count: number;
    }[];
    dailyAnalytics: {
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
    }[];
}>;
export declare const getOrganizerBalance: (organizerId: string) => Promise<{
    available: number;
    pending: number;
    totalEarnings: number;
}>;
export declare const exportOrganizerAnalytics: (organizerId: string, period: string) => Promise<string>;
export declare const requestPayout: (organizerId: string, amount: number, paymentMethod: string) => Promise<{
    message: string;
    payoutId: string;
}>;
export declare const getOrganizerPayouts: (organizerId: string, page?: number, limit?: number) => Promise<{
    payouts: ({
        event: {
            id: string;
            title: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        organizerId: string;
        status: string;
        eventId: string | null;
        amount: number;
        fee: number;
        netAmount: number;
        paymentMethod: string | null;
        reference: string | null;
        processedAt: Date | null;
    })[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const applyForOrganizer: (userId: string, businessName: string, description: string) => Promise<{
    message: string;
    applicationId: string;
}>;
//# sourceMappingURL=organizer.service.d.ts.map