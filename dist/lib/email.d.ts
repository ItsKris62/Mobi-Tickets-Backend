import { Resend } from 'resend';
export declare const resend: Resend;
export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
    replyTo?: string;
    cc?: string | string[];
    bcc?: string | string[];
    tags?: {
        name: string;
        value: string;
    }[];
}
export interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
export declare function sendEmail(options: SendEmailOptions): Promise<EmailResult>;
export interface TicketConfirmationData {
    customerName: string;
    orderId: string;
    eventName: string;
    eventDate: string;
    eventTime: string;
    venue: string;
    tickets: {
        category: string;
        quantity: number;
        price: number;
    }[];
    totalAmount: number;
    currency?: string;
    qrCodeUrl?: string;
}
export declare function sendTicketConfirmation(to: string, data: TicketConfirmationData): Promise<EmailResult>;
export interface WelcomeEmailData {
    name: string;
    email: string;
}
export declare function sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<EmailResult>;
export interface PasswordResetData {
    name: string;
    resetLink: string;
    expiresIn: string;
}
export declare function sendPasswordResetEmail(to: string, data: PasswordResetData): Promise<EmailResult>;
export interface EventReminderData {
    customerName: string;
    eventName: string;
    eventDate: string;
    eventTime: string;
    venue: string;
    timeUntilEvent: string;
}
export declare function sendEventReminder(to: string, data: EventReminderData): Promise<EmailResult>;
export interface RefundConfirmationData {
    customerName: string;
    orderId: string;
    eventName: string;
    refundAmount: number;
    currency?: string;
    refundMethod: string;
    estimatedDays: number;
}
export declare function sendRefundConfirmation(to: string, data: RefundConfirmationData): Promise<EmailResult>;
export declare function testEmailConnection(): Promise<boolean>;
//# sourceMappingURL=email.d.ts.map