// src/modules/webhooks/webhooks.routes.ts
// Webhook endpoints that QStash calls to process background jobs
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { qstashReceiver, EmailJobPayload, NftMintJobPayload, NotificationJobPayload } from '../../lib/qstash';
import { sendEmail, sendTicketConfirmation, sendEventReminder, TicketConfirmationData, EventReminderData } from '../../lib/email';
import { logAudit } from '../../lib/audit';
import { envConfig } from '../../config/env';

// ─────────────────────────────────────────────────────────────────────────────
// Signature Verification Middleware
// ─────────────────────────────────────────────────────────────────────────────
async function verifyQStashSignature(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip verification in development if no signing keys configured
  if (envConfig.NODE_ENV === 'development' && !envConfig.QSTASH_CURRENT_SIGNING_KEY) {
    request.log.warn('⚠️ QStash signature verification skipped in development');
    return;
  }

  const signature = request.headers['upstash-signature'] as string;

  if (!signature) {
    reply.code(401).send({ error: 'Missing Upstash-Signature header' });
    return;
  }

  try {
    // Get the raw body for signature verification
    const body = JSON.stringify(request.body);
    const url = `${envConfig.WEBHOOK_BASE_URL || `http://localhost:${envConfig.PORT}`}${request.url}`;

    const isValid = await qstashReceiver.verify({
      signature,
      body,
      url,
    });

    if (!isValid) {
      reply.code(401).send({ error: 'Invalid signature' });
      return;
    }
  } catch (error) {
    request.log.error({ error }, 'QStash signature verification failed');
    reply.code(401).send({ error: 'Signature verification failed' });
    return;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Extended Email Payload Types
// ─────────────────────────────────────────────────────────────────────────────
interface TicketConfirmationPayload extends TicketConfirmationData {
  type: 'ticket-confirmation';
  to: string;
}

interface EventReminderPayload extends EventReminderData {
  type: 'event-reminder';
  to: string;
}

interface GenericEmailPayload {
  type?: 'generic';
  to: string;
  subject: string;
  text?: string;
  html?: string;
  orderId?: string;
}

type ExtendedEmailPayload = TicketConfirmationPayload | EventReminderPayload | GenericEmailPayload;

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Routes
// ─────────────────────────────────────────────────────────────────────────────
export default async function webhookRoutes(fastify: FastifyInstance) {
  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/webhooks/email - Process email sending jobs
  // ─────────────────────────────────────────────────────────────────────────
  fastify.post<{ Body: ExtendedEmailPayload }>(
    '/email',
    { preHandler: [verifyQStashSignature] },
    async (request, reply) => {
      const payload = request.body;
      const { to } = payload;

      request.log.info({ to, type: payload.type || 'generic' }, '📧 Processing email job');

      try {
        let result;

        // Handle different email types
        if (payload.type === 'ticket-confirmation') {
          const { type, to: recipient, ...data } = payload as TicketConfirmationPayload;
          result = await sendTicketConfirmation(recipient, data);

          if (result.success) {
            await logAudit('TICKET_CONFIRMATION_SENT', 'Order', data.orderId, null, {
              to: recipient,
              eventName: data.eventName,
            });
          }
        } else if (payload.type === 'event-reminder') {
          const { type, to: recipient, ...data } = payload as EventReminderPayload;
          result = await sendEventReminder(recipient, data);

          if (result.success) {
            await logAudit('EVENT_REMINDER_SENT', 'User', null, null, {
              to: recipient,
              eventName: data.eventName,
            });
          }
        } else {
          // Generic email
          const { to: recipient, subject, text, html, orderId } = payload as GenericEmailPayload;
          result = await sendEmail({
            to: recipient,
            subject,
            text,
            html,
          });

          if (result.success && orderId) {
            await logAudit('EMAIL_SENT', 'Order', orderId, null, { to: recipient, subject });
          }
        }

        if (!result.success) {
          request.log.error({ to, error: result.error }, '❌ Failed to send email');
          // Return 500 so QStash will retry
          return reply.code(500).send({ error: result.error });
        }

        request.log.info({ to, messageId: result.messageId }, '✅ Email sent successfully');
        return reply.send({ success: true, messageId: result.messageId });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        request.log.error({ error: errorMessage, to }, '❌ Failed to send email');

        // Return 500 so QStash will retry
        return reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/webhooks/nft-mint - Process NFT minting jobs
  // ─────────────────────────────────────────────────────────────────────────
  fastify.post<{ Body: NftMintJobPayload }>(
    '/nft-mint',
    { preHandler: [verifyQStashSignature] },
    async (request, reply) => {
      const { ticketId, userAddress, eventId, metadata } = request.body;

      request.log.info({ ticketId, userAddress, eventId }, '🎨 Processing NFT mint job');

      try {
        // TODO: Implement actual NFT minting with your smart contract
        // Example with viem/ethers:
        //
        // import { createWalletClient, http } from 'viem';
        // import { privateKeyToAccount } from 'viem/accounts';
        // import { mainnet } from 'viem/chains';
        //
        // const account = privateKeyToAccount(process.env.PRIVATE_KEY);
        // const client = createWalletClient({ account, chain: mainnet, transport: http() });
        //
        // const hash = await client.writeContract({
        //   address: CONTRACT_ADDRESS,
        //   abi: NFT_ABI,
        //   functionName: 'mint',
        //   args: [userAddress, ticketId, metadata],
        // });

        // For now, simulate the minting
        request.log.info({
          ticketId,
          userAddress,
          eventId,
          metadata,
        }, '🎨 [SIMULATED] NFT would be minted');

        await logAudit('NFT_MINTED', 'Ticket', ticketId, null, {
          userAddress,
          eventId,
          simulated: true,
        });

        return reply.send({
          success: true,
          simulated: true,
          ticketId,
          userAddress,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        request.log.error({ error: errorMessage, ticketId, userAddress }, '❌ Failed to mint NFT');

        // Return 500 so QStash will retry
        return reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/webhooks/notification - Process notification jobs
  // ─────────────────────────────────────────────────────────────────────────
  fastify.post<{ Body: NotificationJobPayload }>(
    '/notification',
    { preHandler: [verifyQStashSignature] },
    async (request, reply) => {
      const { userId, title, message, type, data } = request.body;

      request.log.info({ userId, title, type }, '🔔 Processing notification job');

      try {
        // Import the SSE notification function from app
        // Note: In a real app, you might use a separate notification service
        const { sendSSENotification } = await import('../../app');

        // Send real-time notification via SSE
        sendSSENotification(userId, {
          type: 'notification',
          notification: {
            title,
            message,
            type,
            data,
            timestamp: new Date().toISOString(),
          },
        });

        request.log.info({ userId, title }, '✅ Notification sent');

        await logAudit('NOTIFICATION_SENT', 'User', userId, userId, {
          title,
          type,
        });

        return reply.send({ success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        request.log.error({ error: errorMessage, userId, title }, '❌ Failed to send notification');

        // Return 500 so QStash will retry
        return reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/webhooks/scheduled-task - Generic scheduled task handler
  // ─────────────────────────────────────────────────────────────────────────
  fastify.post<{ Body: { taskType: string; payload: Record<string, unknown> } }>(
    '/scheduled-task',
    { preHandler: [verifyQStashSignature] },
    async (request, reply) => {
      const { taskType, payload } = request.body;

      request.log.info({ taskType }, '⏰ Processing scheduled task');

      try {
        switch (taskType) {
          case 'cleanup-expired-tokens':
            // Example: Clean up expired refresh tokens
            request.log.info('🧹 Cleaning up expired tokens...');
            // await prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
            break;

          case 'send-event-reminders':
            // Example: Send reminders for upcoming events
            request.log.info('📅 Sending event reminders...');
            break;

          case 'generate-daily-report':
            // Example: Generate daily analytics report
            request.log.info('📊 Generating daily report...');
            break;

          default:
            request.log.warn({ taskType }, '⚠️ Unknown task type');
        }

        return reply.send({ success: true, taskType });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        request.log.error({ error: errorMessage, taskType }, '❌ Scheduled task failed');
        return reply.code(500).send({ error: errorMessage });
      }
    }
  );
}
