import { TicketCategory } from '@prisma/client';
interface CreateFlashSaleInput {
    eventId: string;
    name: string;
    description?: string;
    discountPercent: number;
    discountAmount?: number;
    startTime: Date;
    endTime: Date;
    maxRedemptions?: number;
    promoCode?: string;
    ticketCategories?: TicketCategory[];
}
interface UpdateFlashSaleInput {
    name?: string;
    description?: string;
    discountPercent?: number;
    discountAmount?: number;
    startTime?: Date;
    endTime?: Date;
    maxRedemptions?: number;
    isActive?: boolean;
    ticketCategories?: TicketCategory[];
}
export declare const createFlashSale: (data: CreateFlashSaleInput, organizerId: string) => Promise<{
    event: {
        id: string;
        title: string;
    };
} & {
    name: string;
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    startTime: Date;
    endTime: Date;
    eventId: string;
    discountPercent: number;
    discountAmount: number | null;
    maxRedemptions: number | null;
    currentRedemptions: number;
    promoCode: string | null;
    ticketCategories: import("@prisma/client/runtime/client").JsonValue | null;
}>;
export declare const getEventFlashSales: (eventId: string, organizerId: string, userRole: string) => Promise<{
    name: string;
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    startTime: Date;
    endTime: Date;
    eventId: string;
    discountPercent: number;
    discountAmount: number | null;
    maxRedemptions: number | null;
    currentRedemptions: number;
    promoCode: string | null;
    ticketCategories: import("@prisma/client/runtime/client").JsonValue | null;
}[]>;
export declare const getActiveFlashSales: (eventId: string) => Promise<{
    name: string;
    id: string;
    description: string | null;
    startTime: Date;
    endTime: Date;
    discountPercent: number;
    discountAmount: number | null;
    maxRedemptions: number | null;
    currentRedemptions: number;
    promoCode: string | null;
    ticketCategories: import("@prisma/client/runtime/client").JsonValue;
}[]>;
export declare const updateFlashSale: (flashSaleId: string, data: UpdateFlashSaleInput, organizerId: string, userRole: string) => Promise<{
    name: string;
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    startTime: Date;
    endTime: Date;
    eventId: string;
    discountPercent: number;
    discountAmount: number | null;
    maxRedemptions: number | null;
    currentRedemptions: number;
    promoCode: string | null;
    ticketCategories: import("@prisma/client/runtime/client").JsonValue | null;
}>;
export declare const deleteFlashSale: (flashSaleId: string, organizerId: string, userRole: string) => Promise<{
    message: string;
}>;
export declare const validatePromoCode: (eventId: string, promoCode: string, ticketCategory: TicketCategory) => Promise<{
    flashSaleId: string;
    discountPercent: number;
    discountAmount: number | null;
    name: string;
}>;
export declare const redeemFlashSale: (flashSaleId: string) => Promise<{
    name: string;
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    startTime: Date;
    endTime: Date;
    eventId: string;
    discountPercent: number;
    discountAmount: number | null;
    maxRedemptions: number | null;
    currentRedemptions: number;
    promoCode: string | null;
    ticketCategories: import("@prisma/client/runtime/client").JsonValue | null;
}>;
export declare const triggerFlashSaleNotification: (flashSaleId: string, organizerId: string) => Promise<{
    notifiedCount: number;
}>;
export {};
//# sourceMappingURL=flashsales.service.d.ts.map