interface PrismaUserInput {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    avatarUrl: string | null;
    phoneNumber: string | null;
    dateOfBirth: Date | null;
    idNumber: string | null;
    county: string | null;
    city: string | null;
    emergencyContact: any;
    isBanned: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface FrontendUser {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar: string;
    role: 'attendee' | 'organizer' | 'admin';
    dateOfBirth: string;
    idNumber: string;
    county: string;
    city: string;
    emergencyContact: {
        name: string;
        phone: string;
        relationship: string;
    };
    joinedDate: string;
    status: 'active' | 'inactive';
    bookedEvents: string[];
    likedEvents: string[];
}
export declare function mapUserToFrontend(user: PrismaUserInput): FrontendUser;
interface PrismaAuditLogInput {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    ipAddress: string | null;
    data: any;
    createdAt: Date;
    user?: {
        id: string;
        fullName: string | null;
        email: string;
    } | null;
}
export interface FrontendSystemLog {
    id: string;
    timestamp: string;
    userId?: string;
    user?: string;
    action: string;
    entity: string;
    entityId: string;
    ipAddress: string;
    status: 'success' | 'error' | 'warning';
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
}
export declare function mapAuditLogToFrontend(log: PrismaAuditLogInput): FrontendSystemLog;
interface PrismaTicketInput {
    id: string;
    category: string;
    name: string | null;
    price: any;
    totalQuantity: number;
    availableQuantity: number;
}
interface PrismaEventInput {
    id: string;
    title: string;
    description: string | null;
    startTime: Date;
    endTime: Date | null;
    location: any;
    posterUrl: string | null;
    videoUrl: string | null;
    category: string | null;
    organizerId: string;
    status: string;
    isPublished: boolean;
    isFeatured: boolean;
    maxCapacity: number | null;
    createdAt: Date;
    updatedAt: Date;
    organizer?: {
        id: string;
        fullName: string | null;
        email: string;
    };
    tickets?: PrismaTicketInput[];
    _count?: {
        orders?: number;
    };
}
export interface FrontendEvent {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    venue: string;
    county: string;
    city: string;
    posterUrl: string;
    category: string;
    organizerId: string;
    organizerName: string;
    ticketTypes: string[];
    ticketIds: Record<string, string>;
    pricing: Record<string, number>;
    capacity: Record<string, number>;
    sold: Record<string, number>;
    status: string;
    featured: boolean;
    createdAt: string;
    updatedAt: string;
}
export declare function mapEventToFrontend(event: PrismaEventInput): FrontendEvent;
interface PrismaOrganizerAppInput {
    id: string;
    userId: string;
    businessName: string;
    description: string;
    status: string;
    createdAt: Date;
    user?: {
        id: string;
        fullName: string | null;
        email: string;
    };
}
export interface FrontendOrganizerRequest {
    id: string;
    userId: string;
    userName: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected';
    requestDate: string;
    documents: string;
}
export declare function mapOrganizerRequestToFrontend(app: PrismaOrganizerAppInput): FrontendOrganizerRequest;
interface PrismaRefundRequestInput {
    id: string;
    orderId: string;
    userId: string;
    reason: string;
    status: string;
    amount: any;
    createdAt: Date;
    user?: {
        id: string;
        fullName: string | null;
        email: string;
    };
    order?: {
        id: string;
        totalAmount: any;
        event?: {
            id: string;
            title: string;
        };
    };
}
export interface FrontendRefundRequest {
    id: string;
    ticketId: string;
    userId: string;
    userName: string;
    eventTitle: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    requestDate: string;
    amount: number;
}
export declare function mapRefundRequestToFrontend(req: PrismaRefundRequestInput): FrontendRefundRequest;
export {};
//# sourceMappingURL=response-mappers.d.ts.map