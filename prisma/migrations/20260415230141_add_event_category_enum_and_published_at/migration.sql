/*
  Warnings:

  - The `category` column on the `events` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('MUSIC', 'SPORTS', 'CONFERENCE', 'THEATER', 'FESTIVAL', 'COMEDY', 'EXHIBITION', 'WORKSHOP', 'OTHER');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "publishedAt" TIMESTAMP(3),
DROP COLUMN "category",
ADD COLUMN     "category" "EventCategory" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "events_category_idx" ON "events"("category");
