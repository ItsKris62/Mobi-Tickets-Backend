import { Client, Receiver } from '@upstash/qstash';
export declare const qstash: Client;
export declare const qstashReceiver: Receiver;
export declare function getWebhookBaseUrl(): string;
export interface EmailJobPayload {
    to: string;
    subject: string;
    text: string;
    html?: string;
    orderId?: string;
}
export interface NftMintJobPayload {
    ticketId: string;
    userAddress: string;
    eventId: string;
    metadata?: Record<string, unknown>;
}
export interface NotificationJobPayload {
    userId: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    data?: Record<string, unknown>;
}
export declare function queueEmail(payload: EmailJobPayload): Promise<string>;
export declare function queueNftMint(payload: NftMintJobPayload): Promise<string>;
export declare function queueNotification(payload: NotificationJobPayload): Promise<string>;
export declare function scheduleJob(webhookPath: string, payload: Record<string, unknown>, notBefore: Date): Promise<string>;
export declare function createCronJob(name: string, webhookPath: string, cronSchedule: string, payload?: Record<string, unknown>): Promise<string>;
export declare function deleteCronJob(scheduleId: string): Promise<void>;
export declare function listCronJobs(): Promise<import("@upstash/qstash").Schedule[]>;
//# sourceMappingURL=qstash.d.ts.map