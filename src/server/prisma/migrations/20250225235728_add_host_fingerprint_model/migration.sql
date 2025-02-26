-- CreateTable
CREATE TABLE "HostFingerprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 22,
    "fingerprint" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HostFingerprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HostFingerprint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HostFingerprint_userId_idx" ON "HostFingerprint"("userId");

-- CreateIndex
CREATE INDEX "HostFingerprint_tenantId_idx" ON "HostFingerprint"("tenantId");

-- CreateIndex
CREATE INDEX "HostFingerprint_host_idx" ON "HostFingerprint"("host");

-- CreateIndex
CREATE UNIQUE INDEX "HostFingerprint_host_userId_key" ON "HostFingerprint"("host", "userId");
