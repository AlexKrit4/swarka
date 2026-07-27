-- AlterTable
ALTER TABLE "HostingLedger" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedByUserId" TEXT,
ADD COLUMN "deletedByEmail" TEXT;

-- CreateIndex
CREATE INDEX "HostingLedger_deletedAt_idx" ON "HostingLedger"("deletedAt");
