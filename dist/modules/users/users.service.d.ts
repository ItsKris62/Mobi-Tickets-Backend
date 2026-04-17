import { Prisma } from '@prisma/client';
import { MultipartFile } from '@fastify/multipart';
export declare const getProfile: (userId: string) => Promise<{
    id: string;
    email: string;
    role: import("@prisma/client").$Enums.Role;
    fullName: string | null;
    avatarUrl: string | null;
    bio: string | null;
} | null>;
export declare const updateProfile: (userId: string, data: {
    fullName?: string;
    bio?: string;
}) => Promise<{
    id: string;
    fullName: string | null;
    bio: string | null;
}>;
export declare const updateAvatar: (userId: string, file: MultipartFile) => Promise<{
    id: string;
    email: string;
    role: import("@prisma/client").$Enums.Role;
    fullName: string | null;
    avatarUrl: string | null;
    bio: string | null;
}>;
export declare const getUserFavorites: (userId: string, page?: number, limit?: number) => Promise<{
    favorites: ({
        organizer: {
            id: string;
            fullName: string | null;
        };
        tickets: {
            name: string;
            id: string;
            price: number;
            availableQuantity: number;
        }[];
    } & {
        id: string;
        county: string | null;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        startTime: Date;
        endTime: Date | null;
        originalStartTime: Date | null;
        location: Prisma.JsonValue | null;
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
        tags: Prisma.JsonValue | null;
        deletedAt: Date | null;
        publishedAt: Date | null;
        isFeatured: boolean;
        featuredAt: Date | null;
    })[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const addFavorite: (userId: string, eventId: string) => Promise<{
    message: string;
}>;
export declare const removeFavorite: (userId: string, eventId: string) => Promise<{
    message: string;
}>;
export declare const getUserPreferences: (userId: string) => Promise<string | number | true | Prisma.JsonObject | Prisma.JsonArray>;
export declare const updateUserPreferences: (userId: string, prefs: {
    notifications?: boolean;
    language?: string;
    theme?: string;
}) => Promise<{
    notifications?: boolean;
    language?: string;
    theme?: string;
}>;
//# sourceMappingURL=users.service.d.ts.map