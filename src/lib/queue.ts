// src/lib/queue.ts – Background job processing with Upstash QStash
// ─────────────────────────────────────────────────────────────────────────────
// This module provides a simple interface for queueing background jobs.
// Jobs are processed by Upstash QStash, which calls your webhook endpoints.
// ─────────────────────────────────────────────────────────────────────────────

import {
  queueEmail,
  queueNftMint,
  queueNotification,
  scheduleJob,
  createCronJob,
  deleteCronJob,
  listCronJobs,
  EmailJobPayload,
  NftMintJobPayload,
  NotificationJobPayload,
} from './qstash';

// Re-export types for convenience
export type { EmailJobPayload, NftMintJobPayload, NotificationJobPayload };

// ─────────────────────────────────────────────────────────────────────────────
// Email Queue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Queue an email to be sent in the background
 *
 * @example
 * await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Your ticket confirmation',
 *   text: 'Thank you for your purchase!',
 *   orderId: 'order-123',
 * });
 */
export const sendEmail = queueEmail;

/**
 * Send a ticket confirmation email
 */
export async function sendTicketConfirmationEmail(
  to: string,
  orderId: string,
  eventName: string,
  ticketCount: number
): Promise<string> {
  return queueEmail({
    to,
    subject: `🎫 Your tickets for ${eventName} are confirmed!`,
    text: `
Thank you for your purchase!

Order ID: ${orderId}
Event: ${eventName}
Tickets: ${ticketCount}

Your tickets have been added to your account. You can view them in the MobiTickets app.

See you at the event!
- The MobiTickets Team
    `.trim(),
    html: `
<h1>🎫 Your tickets are confirmed!</h1>
<p>Thank you for your purchase!</p>
<ul>
  <li><strong>Order ID:</strong> ${orderId}</li>
  <li><strong>Event:</strong> ${eventName}</li>
  <li><strong>Tickets:</strong> ${ticketCount}</li>
</ul>
<p>Your tickets have been added to your account. You can view them in the MobiTickets app.</p>
<p>See you at the event!</p>
<p><em>- The MobiTickets Team</em></p>
    `.trim(),
    orderId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// NFT Minting Queue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Queue an NFT to be minted in the background
 *
 * @example
 * await mintNft({
 *   ticketId: 'ticket-123',
 *   userAddress: '0x...',
 *   eventId: 'event-456',
 * });
 */
export const mintNft = queueNftMint;

/**
 * Queue NFT minting for a purchased ticket
 */
export async function mintTicketNft(
  ticketId: string,
  userAddress: string,
  eventId: string,
  eventName: string,
  ticketCategory: string
): Promise<string> {
  return queueNftMint({
    ticketId,
    userAddress,
    eventId,
    metadata: {
      name: `MobiTicket - ${eventName}`,
      description: `${ticketCategory} ticket for ${eventName}`,
      attributes: [
        { trait_type: 'Event', value: eventName },
        { trait_type: 'Category', value: ticketCategory },
        { trait_type: 'Ticket ID', value: ticketId },
      ],
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification Queue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Queue a notification to be sent to a user
 *
 * @example
 * await sendNotification({
 *   userId: 'user-123',
 *   title: 'Purchase successful!',
 *   message: 'Your tickets are ready.',
 *   type: 'SUCCESS',
 * });
 */
export const sendNotification = queueNotification;

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled Jobs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schedule a job to run at a specific time
 *
 * @example
 * // Send a reminder 1 hour before an event
 * const eventTime = new Date('2024-12-25T18:00:00Z');
 * const reminderTime = new Date(eventTime.getTime() - 60 * 60 * 1000);
 * await scheduleEventReminder(userId, eventId, eventName, reminderTime);
 */
export async function scheduleEventReminder(
  userId: string,
  eventId: string,
  eventName: string,
  reminderTime: Date
): Promise<string> {
  return scheduleJob(
    '/api/webhooks/notification',
    {
      userId,
      title: '⏰ Event starting soon!',
      message: `${eventName} starts in 1 hour. Don't forget your ticket!`,
      type: 'INFO',
      data: { eventId },
    },
    reminderTime
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cron Jobs (Recurring Tasks)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set up periodic cleanup of expired tokens
 * Runs daily at 3 AM
 */
export async function setupTokenCleanupCron(): Promise<string> {
  return createCronJob(
    'cleanup-expired-tokens',
    '/api/webhooks/scheduled-task',
    '0 3 * * *', // 3 AM daily
    { taskType: 'cleanup-expired-tokens' }
  );
}

/**
 * Set up daily report generation
 * Runs daily at 6 AM
 */
export async function setupDailyReportCron(): Promise<string> {
  return createCronJob(
    'daily-report',
    '/api/webhooks/scheduled-task',
    '0 6 * * *', // 6 AM daily
    { taskType: 'generate-daily-report' }
  );
}

// Re-export cron job management functions
export { createCronJob, deleteCronJob, listCronJobs };
