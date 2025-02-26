-- AlterTable
ALTER TABLE "User" ADD COLUMN "provider" TEXT;

-- CreateIndex
CREATE INDEX "User_email_provider_idx" ON "User"("email", "provider");
