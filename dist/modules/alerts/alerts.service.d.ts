interface CreateAlertInput {
    type: string;
    severity: string;
    title: string;
    message: string;
    source?: string;
    metadata?: Record<string, any>;
}
interface ListAlertsFilters {
    type?: string;
    severity?: string;
    status?: string;
    page?: number;
    limit?: number;
}
export declare function createAlert(input: CreateAlertInput): Promise<{
    type: string;
    message: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    status: string;
    severity: string;
    source: string | null;
    metadata: import("@prisma/client/runtime/client").JsonValue | null;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    acknowledgedBy: string | null;
    acknowledgedAt: Date | null;
}>;
export declare function createSystemAlert(type: string, severity: string, title: string, message: string, metadata?: Record<string, any>): Promise<{
    type: string;
    message: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    status: string;
    severity: string;
    source: string | null;
    metadata: import("@prisma/client/runtime/client").JsonValue | null;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    acknowledgedBy: string | null;
    acknowledgedAt: Date | null;
} | null>;
export declare function listAlerts(filters: ListAlertsFilters): Promise<{
    alerts: {
        type: string;
        message: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        status: string;
        severity: string;
        source: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        resolvedBy: string | null;
        resolvedAt: Date | null;
        acknowledgedBy: string | null;
        acknowledgedAt: Date | null;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare function acknowledgeAlert(alertId: string, adminId: string): Promise<{
    type: string;
    message: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    status: string;
    severity: string;
    source: string | null;
    metadata: import("@prisma/client/runtime/client").JsonValue | null;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    acknowledgedBy: string | null;
    acknowledgedAt: Date | null;
}>;
export declare function resolveAlert(alertId: string, adminId: string): Promise<{
    type: string;
    message: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    status: string;
    severity: string;
    source: string | null;
    metadata: import("@prisma/client/runtime/client").JsonValue | null;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    acknowledgedBy: string | null;
    acknowledgedAt: Date | null;
}>;
export {};
//# sourceMappingURL=alerts.service.d.ts.map