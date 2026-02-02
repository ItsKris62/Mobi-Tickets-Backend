import { CreateEventInput } from './events.schema';
import { MultipartFile } from '@fastify/multipart';
export declare const createEvent: (data: CreateEventInput, organizerId: string, posterFile?: MultipartFile, trailerFile?: MultipartFile) => Promise<{
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
}>;
export declare const getEvents: (query: {
    upcoming?: boolean;
}) => Promise<({
    organizer: {
        id: string;
        email: string;
        fullName: string | null;
    };
    tickets: {
        type: string;
        id: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        price: number;
        availableQuantity: number;
    }[];
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
})[]>;
export declare const getEventById: (eventId: string) => Promise<{
    organizer: {
        id: string;
        email: string;
        fullName: string | null;
    };
    tickets: {
        type: string;
        id: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        price: number;
        totalQuantity: number;
        availableQuantity: number;
    }[];
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
}>;
export declare const updateEvent: (eventId: string, userId: string, userRole: string, data: Partial<CreateEventInput>, posterFile?: MultipartFile, trailerFile?: MultipartFile) => Promise<{
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
}>;
export declare const deleteEvent: (eventId: string, userId: string, userRole: string) => Promise<{
    message: string;
}>;
//# sourceMappingURL=events.service.d.ts.map