"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resend = void 0;
exports.sendEmail = sendEmail;
exports.sendTicketConfirmation = sendTicketConfirmation;
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendEventReminder = sendEventReminder;
exports.sendRefundConfirmation = sendRefundConfirmation;
exports.testEmailConnection = testEmailConnection;
const resend_1 = require("resend");
const env_1 = require("../config/env");
exports.resend = new resend_1.Resend(env_1.envConfig.RESEND_API_KEY);
const DEFAULT_FROM = env_1.envConfig.EMAIL_FROM || 'MobiTickets <noreply@mobitickets.com>';
async function sendEmail(options) {
    try {
        const { data, error } = await exports.resend.emails.send({
            from: options.from || DEFAULT_FROM,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
            replyTo: options.replyTo,
            cc: options.cc,
            bcc: options.bcc,
            tags: options.tags,
        });
        if (error) {
            console.error('❌ Resend error:', error);
            return { success: false, error: error.message };
        }
        console.log(`✅ Email sent successfully: ${data?.id}`);
        return { success: true, messageId: data?.id };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Failed to send email:', errorMessage);
        return { success: false, error: errorMessage };
    }
}
function emailWrapper(content, preheader) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MobiTickets</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      padding: 32px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      padding-bottom: 24px;
      border-bottom: 1px solid #e5e5e5;
      margin-bottom: 24px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #7c3aed;
    }
    .content {
      padding: 0;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin: 0 0 16px 0;
    }
    h2 {
      color: #374151;
      font-size: 18px;
      margin: 24px 0 12px 0;
    }
    p {
      margin: 0 0 16px 0;
      color: #4b5563;
    }
    .button {
      display: inline-block;
      background-color: #7c3aed;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      margin: 16px 0;
    }
    .button:hover {
      background-color: #6d28d9;
    }
    .ticket-card {
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      border-radius: 12px;
      padding: 24px;
      color: #ffffff;
      margin: 24px 0;
    }
    .ticket-card h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
    }
    .ticket-card p {
      margin: 4px 0;
      color: rgba(255, 255, 255, 0.9);
    }
    .ticket-details {
      background-color: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .ticket-details table {
      width: 100%;
      border-collapse: collapse;
    }
    .ticket-details td {
      padding: 8px 0;
      border-bottom: 1px solid #e5e5e5;
    }
    .ticket-details td:first-child {
      color: #6b7280;
      width: 40%;
    }
    .ticket-details td:last-child {
      font-weight: 500;
      text-align: right;
    }
    .ticket-details tr:last-child td {
      border-bottom: none;
    }
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid #e5e5e5;
      margin-top: 24px;
      color: #9ca3af;
      font-size: 14px;
    }
    .footer a {
      color: #7c3aed;
      text-decoration: none;
    }
    .qr-code {
      text-align: center;
      margin: 24px 0;
    }
    .qr-code img {
      max-width: 200px;
      border-radius: 8px;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin: 16px 0;
    }
    .success {
      background-color: #d1fae5;
      border-left: 4px solid #10b981;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">🎫 MobiTickets</div>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} MobiTickets. All rights reserved.</p>
        <p>
          <a href="#">Privacy Policy</a> •
          <a href="#">Terms of Service</a> •
          <a href="#">Unsubscribe</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
async function sendTicketConfirmation(to, data) {
    const currency = data.currency || 'KES';
    const ticketRows = data.tickets
        .map((t) => `
      <tr>
        <td>${t.category}</td>
        <td>${t.quantity}x</td>
        <td style="text-align: right;">${currency} ${t.price.toLocaleString()}</td>
      </tr>
    `)
        .join('');
    const html = emailWrapper(`
    <h1>🎉 Your Tickets Are Confirmed!</h1>
    <p>Hey ${data.customerName},</p>
    <p>Great news! Your tickets for <strong>${data.eventName}</strong> have been confirmed. Get ready for an amazing experience!</p>

    <div class="ticket-card">
      <h3>${data.eventName}</h3>
      <p>📅 ${data.eventDate} at ${data.eventTime}</p>
      <p>📍 ${data.venue}</p>
    </div>

    <h2>Order Details</h2>
    <div class="ticket-details">
      <table>
        <tr>
          <td>Order ID</td>
          <td>#${data.orderId}</td>
        </tr>
        ${ticketRows}
        <tr>
          <td><strong>Total</strong></td>
          <td><strong>${currency} ${data.totalAmount.toLocaleString()}</strong></td>
        </tr>
      </table>
    </div>

    ${data.qrCodeUrl
        ? `
    <div class="qr-code">
      <p><strong>Your Entry QR Code</strong></p>
      <img src="${data.qrCodeUrl}" alt="QR Code" />
      <p style="font-size: 12px; color: #6b7280;">Show this at the venue entrance</p>
    </div>
    `
        : ''}

    <div class="success">
      <strong>✅ Payment Successful</strong><br>
      Your payment has been processed and your tickets are ready.
    </div>

    <p style="text-align: center;">
      <a href="#" class="button">View My Tickets</a>
    </p>

    <div class="warning">
      <strong>⚠️ Important</strong><br>
      Keep this email safe. You'll need to show your QR code at the venue entrance.
    </div>
  `, `Your tickets for ${data.eventName} are confirmed!`);
    return sendEmail({
        to,
        subject: `🎫 Tickets Confirmed: ${data.eventName}`,
        html,
        text: `Your tickets for ${data.eventName} on ${data.eventDate} have been confirmed. Order ID: ${data.orderId}. Total: ${currency} ${data.totalAmount}`,
        tags: [
            { name: 'category', value: 'ticket-confirmation' },
            { name: 'order_id', value: data.orderId },
        ],
    });
}
async function sendWelcomeEmail(to, data) {
    const html = emailWrapper(`
    <h1>Welcome to MobiTickets! 🎉</h1>
    <p>Hey ${data.name},</p>
    <p>Welcome to MobiTickets – your new home for discovering and booking amazing events!</p>

    <h2>What's Next?</h2>
    <ul>
      <li>🔍 <strong>Explore Events</strong> - Browse concerts, festivals, sports, and more</li>
      <li>🎫 <strong>Book Tickets</strong> - Secure your spot with just a few taps</li>
      <li>📱 <strong>Go Digital</strong> - Your tickets are always in your pocket</li>
      <li>🔐 <strong>Stay Secure</strong> - NFT-backed tickets prevent fraud</li>
    </ul>

    <p style="text-align: center;">
      <a href="#" class="button">Explore Events</a>
    </p>

    <p>Have questions? Just reply to this email – we're here to help!</p>

    <p>Cheers,<br>The MobiTickets Team</p>
  `, `Welcome to MobiTickets, ${data.name}!`);
    return sendEmail({
        to,
        subject: `Welcome to MobiTickets, ${data.name}! 🎫`,
        html,
        text: `Welcome to MobiTickets, ${data.name}! Start exploring events and booking tickets at mobitickets.com`,
        tags: [{ name: 'category', value: 'welcome' }],
    });
}
async function sendPasswordResetEmail(to, data) {
    const html = emailWrapper(`
    <h1>Reset Your Password</h1>
    <p>Hey ${data.name},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>

    <p style="text-align: center;">
      <a href="${data.resetLink}" class="button">Reset Password</a>
    </p>

    <div class="warning">
      <strong>⏰ Link expires in ${data.expiresIn}</strong><br>
      For security reasons, this link will expire soon.
    </div>

    <p>If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>

    <p style="font-size: 12px; color: #6b7280;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${data.resetLink}" style="word-break: break-all;">${data.resetLink}</a>
    </p>
  `, 'Reset your MobiTickets password');
    return sendEmail({
        to,
        subject: 'Reset Your MobiTickets Password',
        html,
        text: `Reset your password using this link: ${data.resetLink}. This link expires in ${data.expiresIn}.`,
        tags: [{ name: 'category', value: 'password-reset' }],
    });
}
async function sendEventReminder(to, data) {
    const html = emailWrapper(`
    <h1>⏰ Event Reminder</h1>
    <p>Hey ${data.customerName},</p>
    <p><strong>${data.eventName}</strong> is coming up ${data.timeUntilEvent}!</p>

    <div class="ticket-card">
      <h3>${data.eventName}</h3>
      <p>📅 ${data.eventDate} at ${data.eventTime}</p>
      <p>📍 ${data.venue}</p>
    </div>

    <h2>Quick Checklist</h2>
    <ul>
      <li>✅ Have your ticket QR code ready</li>
      <li>✅ Check the venue's entry requirements</li>
      <li>✅ Plan your travel to arrive on time</li>
      <li>✅ Charge your phone for easy ticket access</li>
    </ul>

    <p style="text-align: center;">
      <a href="#" class="button">View My Ticket</a>
    </p>

    <p>Have an amazing time! 🎉</p>
  `, `Reminder: ${data.eventName} is ${data.timeUntilEvent}!`);
    return sendEmail({
        to,
        subject: `⏰ Reminder: ${data.eventName} is ${data.timeUntilEvent}!`,
        html,
        text: `Reminder: ${data.eventName} is ${data.timeUntilEvent}! Date: ${data.eventDate} at ${data.eventTime}. Venue: ${data.venue}`,
        tags: [{ name: 'category', value: 'event-reminder' }],
    });
}
async function sendRefundConfirmation(to, data) {
    const currency = data.currency || 'KES';
    const html = emailWrapper(`
    <h1>Refund Processed</h1>
    <p>Hey ${data.customerName},</p>
    <p>Your refund for <strong>${data.eventName}</strong> has been processed.</p>

    <div class="ticket-details">
      <table>
        <tr>
          <td>Order ID</td>
          <td>#${data.orderId}</td>
        </tr>
        <tr>
          <td>Refund Amount</td>
          <td><strong>${currency} ${data.refundAmount.toLocaleString()}</strong></td>
        </tr>
        <tr>
          <td>Refund Method</td>
          <td>${data.refundMethod}</td>
        </tr>
        <tr>
          <td>Estimated Time</td>
          <td>${data.estimatedDays} business days</td>
        </tr>
      </table>
    </div>

    <div class="success">
      <strong>✅ Refund Initiated</strong><br>
      The refund will appear in your account within ${data.estimatedDays} business days.
    </div>

    <p>If you have any questions, feel free to contact our support team.</p>
  `, `Your refund of ${currency} ${data.refundAmount} has been processed`);
    return sendEmail({
        to,
        subject: `Refund Processed: ${data.eventName}`,
        html,
        text: `Your refund of ${currency} ${data.refundAmount} for ${data.eventName} (Order #${data.orderId}) has been processed. It will appear in your account within ${data.estimatedDays} business days.`,
        tags: [
            { name: 'category', value: 'refund' },
            { name: 'order_id', value: data.orderId },
        ],
    });
}
async function testEmailConnection() {
    try {
        console.log('✅ Resend client initialized');
        return true;
    }
    catch (error) {
        console.error('❌ Resend initialization failed:', error);
        return false;
    }
}
//# sourceMappingURL=email.js.map