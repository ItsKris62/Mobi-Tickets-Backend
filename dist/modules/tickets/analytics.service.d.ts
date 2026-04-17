export declare function invalidateOrganizerAnalyticsCache(organizerId: string): Promise<void>;
export declare const getOrganizerSummary: (organizerId: string, startDate?: Date, endDate?: Date) => Promise<{
    totalEvents: number;
    totalTicketsSold: number;
    totalRevenue: number;
    totalCapacity: number;
    overallOccupancyRate: number;
    totalCheckIns: number;
    checkInRate: number;
    eventsByStatus: {
        DRAFT?: undefined;
        PUBLISHED?: undefined;
        COMPLETED?: undefined;
        CANCELLED?: undefined;
        POSTPONED?: undefined;
    };
    revenueTrend: {
        current: number;
        previous: number;
        changePercent: number;
        direction: string;
    };
    ticketsTrend: {
        current: number;
        previous: number;
        changePercent: number;
        direction: string;
    };
} | {
    totalEvents: number;
    totalTicketsSold: number;
    totalRevenue: number;
    totalCapacity: number;
    overallOccupancyRate: number;
    totalCheckIns: number;
    checkInRate: number;
    eventsByStatus: {
        DRAFT: number;
        PUBLISHED: number;
        COMPLETED: number;
        CANCELLED: number;
        POSTPONED: number;
    };
    revenueTrend: {
        current: number;
        previous: number;
        changePercent: number;
        direction: "flat" | "up" | "down";
    };
    ticketsTrend: {
        current: number;
        previous: number;
        changePercent: number;
        direction: "flat" | "up" | "down";
    };
}>;
export declare const getRevenueTimeSeries: (organizerId: string) => Promise<{
    data: never[];
    totalRevenue: number;
    interval: string;
}>;
export declare const getEventPerformance: (organizerId: string, options: {
    status?: string;
    sortBy?: "revenue" | "ticketsSold" | "occupancyRate" | "checkInRate";
    order?: "asc" | "desc";
}) => Promise<any>;
export declare const getDetailedEventAnalytics: (organizerId: string, eventId: string) => Promise<any>;
export declare const exportEventAttendeesCSV: (organizerId: string, eventId: string) => Promise<string>;
//# sourceMappingURL=analytics.service.d.ts.map