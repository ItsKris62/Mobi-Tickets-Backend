import { queueEmail, queueNftMint, queueNotification, createCronJob, deleteCronJob, listCronJobs, EmailJobPayload, NftMintJobPayload, NotificationJobPayload } from './qstash';
export type { EmailJobPayload, NftMintJobPayload, NotificationJobPayload };
export declare const sendEmail: typeof queueEmail;
export declare function sendTicketConfirmationEmail(to: string, orderId: string, eventName: string, ticketCount: number): Promise<string>;
export declare const mintNft: typeof queueNftMint;
export declare function mintTicketNft(ticketId: string, userAddress: string, eventId: string, eventName: string, ticketCategory: string): Promise<string>;
export declare const sendNotification: typeof queueNotification;
export declare function scheduleEventReminder(userId: string, eventId: string, eventName: string, reminderTime: Date): Promise<string>;
export declare function setupTokenCleanupCron(): Promise<string>;
export declare function setupDailyReportCron(): Promise<string>;
export { createCronJob, deleteCronJob, listCronJobs };
//# sourceMappingURL=queue.d.ts.map