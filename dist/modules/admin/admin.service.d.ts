export declare const getDashboardStats: () => Promise<{
    totalEvents: number;
    totalUsers: number;
    recentOrders: number;
    totalRevenue: number;
}>;
export declare const getAllUsers: (page?: number, limit?: number, options?: {
    search?: string;
    role?: string;
}) => Promise<{
    users: import("../../lib/response-mappers").FrontendUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const banUser: (userId: string, adminId: string, reason: string) => Promise<{
    message: string;
    success: boolean;
}>;
export declare const unbanUser: (userId: string, adminId: string) => Promise<{
    message: string;
    success: boolean;
}>;
export declare const changeUserRole: (userId: string, newRole: "ATTENDEE" | "ORGANIZER" | "ADMIN", adminId: string) => Promise<{
    message: string;
    success: boolean;
}>;
export declare const getAllEvents: (page?: number, limit?: number) => Promise<{
    events: import("../../lib/response-mappers").FrontendEvent[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const getAuditLogs: (page?: number, limit?: number, options?: {
    type?: string;
    search?: string;
}) => Promise<{
    logs: import("../../lib/response-mappers").FrontendSystemLog[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const exportAuditLogs: (format?: "csv" | "json", options?: {
    type?: string;
    startDate?: string;
    endDate?: string;
}) => Promise<string>;
export declare const adminCancelEvent: (eventId: string, reason: string, adminId: string) => Promise<{
    event: {
        id: string;
        county: string | null;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        startTime: Date;
        endTime: Date | null;
        originalStartTime: Date | null;
        location: import("@prisma/client/runtime/client").JsonValue | null;
        posterUrl: string | null;
        videoUrl: string | null;
        organizerId: string;
        status: import("@prisma/client").$Enums.EventStatus;
        isPublished: boolean;
        ageLimit: number | null;
        maxCapacity: number | null;
        postponementReason: string | null;
        postponedAt: Date | null;
        category: import("@prisma/client").$Enums.EventCategory;
        tags: import("@prisma/client/runtime/client").JsonValue | null;
        deletedAt: Date | null;
        publishedAt: Date | null;
        isFeatured: boolean;
        featuredAt: Date | null;
    };
    attendeesNotified: number;
    message: string;
}>;
export declare const getSystemHealth: () => Promise<{
    status: string;
    uptime: number;
    timestamp: string;
    services: {
        database: string;
        redis: string;
    };
    memory: {
        heapUsed: number;
        heapTotal: number;
        rss: number;
    };
}>;
export declare const featureEvent: (eventId: string, featured: boolean, adminId: string) => Promise<{
    message: string;
}>;
export declare const getOrganizerRequests: (page?: number, limit?: number) => Promise<{
    requests: import("../../lib/response-mappers").FrontendOrganizerRequest[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const reviewOrganizerRequest: (requestId: string, adminId: string, status: "APPROVED" | "REJECTED", notes?: string) => Promise<{
    message: string;
}>;
export declare const getRefundRequests: (page?: number, limit?: number) => Promise<{
    requests: import("../../lib/response-mappers").FrontendRefundRequest[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const reviewRefundRequest: (requestId: string, adminId: string, status: "APPROVED" | "REJECTED", notes?: string) => Promise<{
    message: string;
}>;
//# sourceMappingURL=admin.service.d.ts.map