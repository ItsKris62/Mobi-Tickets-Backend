// src/lib/queue.ts – Async job processor backbone
import { Queue, Worker } from 'bullmq';
import { redis } from './redis';
import * as nodemailer from 'nodemailer';
import { logAudit } from './audit';

export const emailQueue = new Queue('email', { connection: redis });
export const nftQueue = new Queue('nft-mint', { connection: redis });

// Email transporter (configure with your SMTP – e.g., Gmail, SendGrid)
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: { user: 'user@example.com', pass: 'password' },
});

new Worker('email', async (job) => {
  const { to, subject, text } = job.data;
  await transporter.sendMail({ from: 'no-reply@mobitickets.com', to, subject, text });
  await logAudit('EMAIL_SENT', 'Order', job.data.orderId, null, { to });
}, { connection: redis });

new Worker('nft-mint', async (job) => {
  const { ticketId, userAddress } = job.data;
  // Mock NFT mint (replace with real contract call via viem/ethers)
  console.log(`Minting NFT for ticket ${ticketId} to ${userAddress}`);
  // Example: await contract.mint(userAddress, ticketId)
  await logAudit('NFT_MINTED', 'Ticket', ticketId, null, { userAddress });
}, { connection: redis });