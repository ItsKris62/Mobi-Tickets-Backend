"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCronJobs = exports.deleteCronJob = exports.createCronJob = exports.sendNotification = exports.mintNft = exports.sendEmail = void 0;
exports.sendTicketConfirmationEmail = sendTicketConfirmationEmail;
exports.mintTicketNft = mintTicketNft;
exports.scheduleEventReminder = scheduleEventReminder;
exports.setupTokenCleanupCron = setupTokenCleanupCron;
exports.setupDailyReportCron = setupDailyReportCron;
const qstash_1 = require("./qstash");
Object.defineProperty(exports, "createCronJob", { enumerable: true, get: function () { return qstash_1.createCronJob; } });
Object.defineProperty(exports, "deleteCronJob", { enumerable: true, get: function () { return qstash_1.deleteCronJob; } });
Object.defineProperty(exports, "listCronJobs", { enumerable: true, get: function () { return qstash_1.listCronJobs; } });
exports.sendEmail = qstash_1.queueEmail;
async function sendTicketConfirmationEmail(to, orderId, eventName, ticketCount) {
    return (0, qstash_1.queueEmail)({
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
exports.mintNft = qstash_1.queueNftMint;
async function mintTicketNft(ticketId, userAddress, eventId, eventName, ticketCategory) {
    return (0, qstash_1.queueNftMint)({
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
exports.sendNotification = qstash_1.queueNotification;
async function scheduleEventReminder(userId, eventId, eventName, reminderTime) {
    return (0, qstash_1.scheduleJob)('/api/webhooks/notification', {
        userId,
        title: '⏰ Event starting soon!',
        message: `${eventName} starts in 1 hour. Don't forget your ticket!`,
        type: 'INFO',
        data: { eventId },
    }, reminderTime);
}
async function setupTokenCleanupCron() {
    return (0, qstash_1.createCronJob)('cleanup-expired-tokens', '/api/webhooks/scheduled-task', '0 3 * * *', { taskType: 'cleanup-expired-tokens' });
}
async function setupDailyReportCron() {
    return (0, qstash_1.createCronJob)('daily-report', '/api/webhooks/scheduled-task', '0 6 * * *', { taskType: 'generate-daily-report' });
}
//# sourceMappingURL=queue.js.map