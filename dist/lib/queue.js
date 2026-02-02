"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nftQueue = exports.emailQueue = void 0;
const tslib_1 = require("tslib");
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
const nodemailer = tslib_1.__importStar(require("nodemailer"));
const audit_1 = require("./audit");
exports.emailQueue = new bullmq_1.Queue('email', { connection: redis_1.redis });
exports.nftQueue = new bullmq_1.Queue('nft-mint', { connection: redis_1.redis });
const transporter = nodemailer.createTransport({
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: { user: 'user@example.com', pass: 'password' },
});
new bullmq_1.Worker('email', async (job) => {
    const { to, subject, text } = job.data;
    await transporter.sendMail({ from: 'no-reply@mobitickets.com', to, subject, text });
    await (0, audit_1.logAudit)('EMAIL_SENT', 'Order', job.data.orderId, null, { to });
}, { connection: redis_1.redis });
new bullmq_1.Worker('nft-mint', async (job) => {
    const { ticketId, userAddress } = job.data;
    console.log(`Minting NFT for ticket ${ticketId} to ${userAddress}`);
    await (0, audit_1.logAudit)('NFT_MINTED', 'Ticket', ticketId, null, { userAddress });
}, { connection: redis_1.redis });
//# sourceMappingURL=queue.js.map