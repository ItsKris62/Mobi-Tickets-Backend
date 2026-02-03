// src/lib/qstash.ts
// Upstash QStash client - serverless message queue for background jobs
import { Client, Receiver } from '@upstash/qstash';
import { envConfig } from '../config/env';

// ─────────────────────────────────────────────────────────────────────────────
// QStash Client - for publishing messages/jobs
// ─────────────────────────────────────────────────────────────────────────────
export const qstash = new Client({
  token: envConfig.QSTASH_TOKEN,
});

// ─────────────────────────────────────────────────────────────────────────────
// QStash Receiver - for verifying webhook signatures
// ─────────────────────────────────────────────────────────────────────────────
export const qstashReceiver = new Receiver({
  currentSigningKey: envConfig.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: envConfig.QSTASH_NEXT_SIGNING_KEY,
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Get the base URL for webhooks
// ─────────────────────────────────────────────────────────────────────────────
export function getWebhookBaseUrl(): string {
  // In production, use your actual domain
  // In development, you'll need a tunnel (ngrok, localtunnel, etc.) or use QStash's
  // built-in URL for testing
  return envConfig.WEBHOOK_BASE_URL || `http://localhost:${envConfig.PORT}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Job Types - Define the structure of your background jobs
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Queue Functions - Publish jobs to QStash
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Queue an email to be sent
 * QStash will call POST /api/webhooks/email with the payload
 */
export async function queueEmail(payload: EmailJobPayload): Promise<string> {
  const baseUrl = getWebhookBaseUrl();

  const response = await qstash.publishJSON({
    url: `${baseUrl}/api/webhooks/email`,
    body: payload,
    retries: 3,
    // Optional: Add delay before processing
    // delay: 5, // seconds
  });

  console.log(`📧 Email job queued: ${response.messageId}`);
  return response.messageId;
}

/**
 * Queue an NFT to be minted
 * QStash will call POST /api/webhooks/nft-mint with the payload
 */
export async function queueNftMint(payload: NftMintJobPayload): Promise<string> {
  const baseUrl = getWebhookBaseUrl();

  const response = await qstash.publishJSON({
    url: `${baseUrl}/api/webhooks/nft-mint`,
    body: payload,
    retries: 5, // NFT minting might need more retries
  });

  console.log(`🎨 NFT mint job queued: ${response.messageId}`);
  return response.messageId;
}

/**
 * Queue a notification to be sent to a user
 * QStash will call POST /api/webhooks/notification with the payload
 */
export async function queueNotification(payload: NotificationJobPayload): Promise<string> {
  const baseUrl = getWebhookBaseUrl();

  const response = await qstash.publishJSON({
    url: `${baseUrl}/api/webhooks/notification`,
    body: payload,
    retries: 3,
  });

  console.log(`🔔 Notification job queued: ${response.messageId}`);
  return response.messageId;
}

/**
 * Schedule a job to run at a specific time
 * Useful for reminders, scheduled notifications, etc.
 */
export async function scheduleJob(
  webhookPath: string,
  payload: Record<string, unknown>,
  notBefore: Date
): Promise<string> {
  const baseUrl = getWebhookBaseUrl();

  const response = await qstash.publishJSON({
    url: `${baseUrl}${webhookPath}`,
    body: payload,
    notBefore: Math.floor(notBefore.getTime() / 1000), // Unix timestamp
    retries: 3,
  });

  console.log(`⏰ Scheduled job queued for ${notBefore.toISOString()}: ${response.messageId}`);
  return response.messageId;
}

/**
 * Create a recurring job (cron schedule)
 * Useful for periodic tasks like cleanup, reports, etc.
 */
export async function createCronJob(
  name: string,
  webhookPath: string,
  cronSchedule: string, // e.g., "0 9 * * *" for 9 AM daily
  payload?: Record<string, unknown>
): Promise<string> {
  const baseUrl = getWebhookBaseUrl();

  const response = await qstash.schedules.create({
    destination: `${baseUrl}${webhookPath}`,
    cron: cronSchedule,
    body: JSON.stringify(payload || {}),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log(`🔄 Cron job "${name}" created: ${response.scheduleId}`);
  return response.scheduleId;
}

/**
 * Delete a cron job
 */
export async function deleteCronJob(scheduleId: string): Promise<void> {
  await qstash.schedules.delete(scheduleId);
  console.log(`🗑️ Cron job deleted: ${scheduleId}`);
}

/**
 * List all cron jobs
 */
export async function listCronJobs() {
  return await qstash.schedules.list();
}
