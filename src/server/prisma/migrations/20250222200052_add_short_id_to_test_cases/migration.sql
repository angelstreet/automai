/*
  Warnings:

  - A unique constraint covering the columns `[shortId]` on the table `TestCase` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shortId` to the `TestCase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TestCase" ADD COLUMN     "shortId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TestCase_shortId_key" ON "TestCase"("shortId");

-- CreateIndex
CREATE INDEX "TestCase_shortId_idx" ON "TestCase"("shortId");
