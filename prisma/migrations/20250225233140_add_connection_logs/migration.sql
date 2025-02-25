-- CreateTable
CREATE TABLE "ConnectionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "action" TEXT,
    "userId" TEXT,
    "tenantId" TEXT,
    "connectionId" TEXT,
    "ip" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ConnectionLog_userId_idx" ON "ConnectionLog"("userId");

-- CreateIndex
CREATE INDEX "ConnectionLog_tenantId_idx" ON "ConnectionLog"("tenantId");

-- CreateIndex
CREATE INDEX "ConnectionLog_connectionId_idx" ON "ConnectionLog"("connectionId");

-- CreateIndex
CREATE INDEX "ConnectionLog_action_idx" ON "ConnectionLog"("action");

-- CreateIndex
CREATE INDEX "ConnectionLog_level_idx" ON "ConnectionLog"("level");

-- CreateIndex
CREATE INDEX "ConnectionLog_timestamp_idx" ON "ConnectionLog"("timestamp");
