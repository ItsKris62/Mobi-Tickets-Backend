import { NotificationType, Prisma } from '@prisma/client';
export declare const setSSESender: (sender: (userId: string, data: Record<string, unknown>) => void) => void;
interface CreateNotificationInput {
    userId: string;
    eventId?: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
}
interface BulkNotificationInput {
    userIds: string[];
    eventId?: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
}
export declare const createNotification: (input: CreateNotificationInput) => Promise<{
    type: import("@prisma/client").$Enums.NotificationType;
    message: string;
    id: string;
    createdAt: Date;
    title: string;
    userId: string;
    eventId: string | null;
    data: Prisma.JsonValue | null;
    channel: string;
    isRead: boolean;
    readAt: Date | null;
}>;
export declare const createBulkNotifications: (input: BulkNotificationInput) => Promise<Prisma.BatchPayload>;
export declare const getUserNotifications: (userId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
}) => Promise<({
    event: {
        id: string;
        title: string;
        posterUrl: string | null;
    } | null;
} & {
    type: import("@prisma/client").$Enums.NotificationType;
    message: string;
    id: string;
    createdAt: Date;
    title: string;
    userId: string;
    eventId: string | null;
    data: Prisma.JsonValue | null;
    channel: string;
    isRead: boolean;
    readAt: Date | null;
})[]>;
export declare const getUnreadCount: (userId: string) => Promise<number>;
export declare const markAsRead: (notificationId: string, userId: string) => Promise<Prisma.BatchPayload>;
export declare const markAllAsRead: (userId: string) => Promise<Prisma.BatchPayload>;
export declare const deleteNotification: (notificationId: string, userId: string) => Promise<Prisma.BatchPayload>;
export declare const notifyEventAttendees: (eventId: string, type: NotificationType, title: string, message: string, data?: Record<string, unknown>, sendEmail?: boolean) => Promise<{
    notifiedCount: number;
}>;
export declare const notifyAdmins: (type: NotificationType, title: string, message: string, data?: Record<string, unknown>) => Promise<{
    notifiedCount: number;
}>;
export {};
//# sourceMappingURL=notification.service.d.ts.map