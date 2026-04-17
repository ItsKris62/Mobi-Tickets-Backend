/*
  Warnings:

  - The primary key for the `event_analytics` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `date` on the `event_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `refundAmount` on the `event_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `refunds` on the `event_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `revenue` on the `event_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `ticketsSold` on the `event_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `uniqueVisitors` on the `event_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `views` on the `event_analytics` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[eventId]` on the table `event_analytics` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ticketNumber]` on the table `ticket_purchases` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrCodeData]` on the table `ticket_purchases` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `event_analytics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qrCodeData` to the `ticket_purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticketNumber` to the `ticket_purchases` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "event_analytics" DROP CONSTRAINT "event_analytics_eventId_fkey";

-- DropIndex
DROP INDEX "event_analytics_date_idx";

-- DropIndex
DROP INDEX "event_analytics_eventId_date_key";

-- AlterTable
ALTER TABLE "event_analytics" DROP CONSTRAINT "event_analytics_pkey",
DROP COLUMN "date",
DROP COLUMN "refundAmount",
DROP COLUMN "refunds",
DROP COLUMN "revenue",
DROP COLUMN "ticketsSold",
DROP COLUMN "uniqueVisitors",
DROP COLUMN "views",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "salesByDay" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "ticketsByType" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "totalCapacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalCheckIns" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalTicketsSold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "eventId" SET DATA TYPE TEXT,
ADD CONSTRAINT "event_analytics_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ticket_purchases" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "qrCodeData" TEXT NOT NULL,
ADD COLUMN     "ticketNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "event_analytics_eventId_key" ON "event_analytics"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_purchases_ticketNumber_key" ON "ticket_purchases"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_purchases_qrCodeData_key" ON "ticket_purchases"("qrCodeData");

-- AddForeignKey
ALTER TABLE "event_analytics" ADD CONSTRAINT "event_analytics_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
