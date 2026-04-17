"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = webhookRoutes;
const qstash_1 = require("../../lib/qstash");
const email_1 = require("../../lib/email");
const audit_1 = require("../../lib/audit");
const env_1 = require("../../config/env");
async function verifyQStashSignature(request, reply) {
    if (env_1.envConfig.NODE_ENV === 'development' && !env_1.envConfig.QSTASH_CURRENT_SIGNING_KEY) {
        request.log.warn('⚠️ QStash signature verification skipped in development');
        return;
    }
    const signature = request.headers['upstash-signature'];
    if (!signature) {
        reply.code(401).send({ error: 'Missing Upstash-Signature header' });
        return;
    }
    try {
        const body = JSON.stringify(request.body);
        const url = `${env_1.envConfig.WEBHOOK_BASE_URL || `http://localhost:${env_1.envConfig.PORT}`}${request.url}`;
        const isValid = await qstash_1.qstashReceiver.verify({
            signature,
            body,
            url,
        });
        if (!isValid) {
            reply.code(401).send({ error: 'Invalid signature' });
            return;
        }
    }
    catch (error) {
        request.log.error({ error }, 'QStash signature verification failed');
        reply.code(401).send({ error: 'Signature verification failed' });
        return;
    }
}
async function webhookRoutes(fastify) {
    fastify.post('/email', { preHandler: [verifyQStashSignature] }, async (request, reply) => {
        const payload = request.body;
        const { to } = payload;
        request.log.info({ to, type: payload.type || 'generic' }, '📧 Processing email job');
        try {
            let result;
            if (payload.type === 'ticket-confirmation') {
                const { type, to: recipient, ...data } = payload;
                result = await (0, email_1.sendTicketConfirmation)(recipient, data);
                if (result.success) {
                    await (0, audit_1.logAudit)('TICKET_CONFIRMATION_SENT', 'Order', data.orderId, null, {
                        to: recipient,
                        eventName: data.eventName,
                    });
                }
            }
            else if (payload.type === 'event-reminder') {
                const { type, to: recipient, ...data } = payload;
                result = await (0, email_1.sendEventReminder)(recipient, data);
                if (result.success) {
                    await (0, audit_1.logAudit)('EVENT_REMINDER_SENT', 'User', null, null, {
                        to: recipient,
                        eventName: data.eventName,
                    });
                }
            }
            else {
                const { to: recipient, subject, text, html, orderId } = payload;
                result = await (0, email_1.sendEmail)({
                    to: recipient,
                    subject,
                    text,
                    html,
                });
                if (result.success && orderId) {
                    await (0, audit_1.logAudit)('EMAIL_SENT', 'Order', orderId, null, { to: recipient, subject });
                }
            }
            if (!result.success) {
                request.log.error({ to, error: result.error }, '❌ Failed to send email');
                return reply.code(500).send({ error: result.error });
            }
            request.log.info({ to, messageId: result.messageId }, '✅ Email sent successfully');
            return reply.send({ success: true, messageId: result.messageId });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            request.log.error({ error: errorMessage, to }, '❌ Failed to send email');
            return reply.code(500).send({ error: errorMessage });
        }
    });
    fastify.post('/nft-mint', { preHandler: [verifyQStashSignature] }, async (request, reply) => {
        const { ticketId, userAddress, eventId, metadata } = request.body;
        request.log.info({ ticketId, userAddress, eventId }, '🎨 Processing NFT mint job');
        try {
            request.log.info({
                ticketId,
                userAddress,
                eventId,
                metadata,
            }, '🎨 [SIMULATED] NFT would be minted');
            await (0, audit_1.logAudit)('NFT_MINTED', 'Ticket', ticketId, null, {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            request.log.error({ error: errorMessage, ticketId, userAddress }, '❌ Failed to mint NFT');
            return reply.code(500).send({ error: errorMessage });
        }
    });
    fastify.post('/notification', { preHandler: [verifyQStashSignature] }, async (request, reply) => {
        const { userId, title, message, type, data } = request.body;
        request.log.info({ userId, title, type }, '🔔 Processing notification job');
        try {
            const { sendSSENotification } = await Promise.resolve().then(() => __importStar(require('../../app')));
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
            await (0, audit_1.logAudit)('NOTIFICATION_SENT', 'User', userId, userId, {
                title,
                type,
            });
            return reply.send({ success: true });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            request.log.error({ error: errorMessage, userId, title }, '❌ Failed to send notification');
            return reply.code(500).send({ error: errorMessage });
        }
    });
    fastify.post('/scheduled-task', { preHandler: [verifyQStashSignature] }, async (request, reply) => {
        const { taskType, payload } = request.body;
        request.log.info({ taskType }, '⏰ Processing scheduled task');
        try {
            switch (taskType) {
                case 'cleanup-expired-tokens':
                    request.log.info('🧹 Cleaning up expired tokens...');
                    break;
                case 'send-event-reminders':
                    request.log.info('📅 Sending event reminders...');
                    break;
                case 'generate-daily-report':
                    request.log.info('📊 Generating daily report...');
                    break;
                default:
                    request.log.warn({ taskType }, '⚠️ Unknown task type');
            }
            return reply.send({ success: true, taskType });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            request.log.error({ error: errorMessage, taskType }, '❌ Scheduled task failed');
            return reply.code(500).send({ error: errorMessage });
        }
    });
}
//# sourceMappingURL=webhooks.routes.js.map