export declare const getDashboardStats: () => Promise<{
    totalEvents: number;
    totalUsers: number;
    recentOrders: number;
    totalRevenue: number;
}>;
export declare const getAllUsers: (page?: number, limit?: number) => Promise<{
    users: {
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        fullName: string | null;
        avatarUrl: string | null;
        createdAt: Date;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const banUser: (userId: string, adminId: string, reason: string) => Promise<{
    message: string;
}>;
export declare const getAllEvents: (page?: number, limit?: number) => Promise<{
    events: ({
        organizer: {
            id: string;
            email: string;
            fullName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        startTime: Date;
        endTime: Date | null;
        location: import("@prisma/client/runtime/client").JsonValue | null;
        posterUrl: string | null;
        videoUrl: string | null;
        organizerId: string;
        isPublished: boolean;
    })[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const getAuditLogs: (page?: number, limit?: number) => Promise<{
    logs: {
        id: string;
        createdAt: Date;
        userId: string | null;
        action: string;
        entity: string;
        entityId: string | null;
        ipAddress: string | null;
        data: import("@prisma/client/runtime/client").JsonValue | null;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
//# sourceMappingURL=admin.service.d.ts.map