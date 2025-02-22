/*
  Warnings:

  - You are about to drop the column `testcaseId` on the `Execution` table. All the data in the column will be lost.
  - You are about to drop the `TestCase` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `usecaseId` to the `Execution` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Execution" DROP CONSTRAINT "Execution_testcaseId_fkey";

-- DropForeignKey
ALTER TABLE "TestCase" DROP CONSTRAINT "TestCase_projectId_fkey";

-- AlterTable
ALTER TABLE "Execution" DROP COLUMN "testcaseId",
ADD COLUMN     "usecaseId" TEXT NOT NULL;

-- DropTable
DROP TABLE "TestCase";

-- CreateTable
CREATE TABLE "UseCase" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UseCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UseCase_shortId_key" ON "UseCase"("shortId");

-- CreateIndex
CREATE INDEX "UseCase_shortId_idx" ON "UseCase"("shortId");

-- AddForeignKey
ALTER TABLE "UseCase" ADD CONSTRAINT "UseCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_usecaseId_fkey" FOREIGN KEY ("usecaseId") REFERENCES "UseCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
