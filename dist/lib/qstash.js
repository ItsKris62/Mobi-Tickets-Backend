"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qstashReceiver = exports.qstash = void 0;
exports.getWebhookBaseUrl = getWebhookBaseUrl;
exports.queueEmail = queueEmail;
exports.queueNftMint = queueNftMint;
exports.queueNotification = queueNotification;
exports.scheduleJob = scheduleJob;
exports.createCronJob = createCronJob;
exports.deleteCronJob = deleteCronJob;
exports.listCronJobs = listCronJobs;
const qstash_1 = require("@upstash/qstash");
const env_1 = require("../config/env");
exports.qstash = new qstash_1.Client({
    token: env_1.envConfig.QSTASH_TOKEN,
});
exports.qstashReceiver = new qstash_1.Receiver({
    currentSigningKey: env_1.envConfig.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env_1.envConfig.QSTASH_NEXT_SIGNING_KEY,
});
function getWebhookBaseUrl() {
    return env_1.envConfig.WEBHOOK_BASE_URL || `http://localhost:${env_1.envConfig.PORT}`;
}
async function queueEmail(payload) {
    const baseUrl = getWebhookBaseUrl();
    const response = await exports.qstash.publishJSON({
        url: `${baseUrl}/api/webhooks/email`,
        body: payload,
        retries: 3,
    });
    console.log(`📧 Email job queued: ${response.messageId}`);
    return response.messageId;
}
async function queueNftMint(payload) {
    const baseUrl = getWebhookBaseUrl();
    const response = await exports.qstash.publishJSON({
        url: `${baseUrl}/api/webhooks/nft-mint`,
        body: payload,
        retries: 5,
    });
    console.log(`🎨 NFT mint job queued: ${response.messageId}`);
    return response.messageId;
}
async function queueNotification(payload) {
    const baseUrl = getWebhookBaseUrl();
    const response = await exports.qstash.publishJSON({
        url: `${baseUrl}/api/webhooks/notification`,
        body: payload,
        retries: 3,
    });
    console.log(`🔔 Notification job queued: ${response.messageId}`);
    return response.messageId;
}
async function scheduleJob(webhookPath, payload, notBefore) {
    const baseUrl = getWebhookBaseUrl();
    const response = await exports.qstash.publishJSON({
        url: `${baseUrl}${webhookPath}`,
        body: payload,
        notBefore: Math.floor(notBefore.getTime() / 1000),
        retries: 3,
    });
    console.log(`⏰ Scheduled job queued for ${notBefore.toISOString()}: ${response.messageId}`);
    return response.messageId;
}
async function createCronJob(name, webhookPath, cronSchedule, payload) {
    const baseUrl = getWebhookBaseUrl();
    const response = await exports.qstash.schedules.create({
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
async function deleteCronJob(scheduleId) {
    await exports.qstash.schedules.delete(scheduleId);
    console.log(`🗑️ Cron job deleted: ${scheduleId}`);
}
async function listCronJobs() {
    return await exports.qstash.schedules.list();
}
//# sourceMappingURL=qstash.js.map