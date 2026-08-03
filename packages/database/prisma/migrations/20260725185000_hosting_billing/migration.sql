-- CreateEnum
CREATE TYPE "HostingPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'CANCELED', 'FAILED');

-- CreateEnum
CREATE TYPE "HostingLedgerType" AS ENUM ('PAYMENT', 'DAILY_CHARGE', 'MANUAL_ADJUSTMENT');

-- CreateTable
CREATE TABLE "HostingBalance" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "balanceRub" INTEGER NOT NULL DEFAULT 0,
    "dailyRateRub" INTEGER NOT NULL DEFAULT 22,
    "manualSiteEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastDailyChargeAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingPayment" (
    "id" TEXT NOT NULL,
    "amountRub" INTEGER NOT NULL,
    "status" "HostingPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'yookassa',
    "externalId" TEXT,
    "createdByUserId" TEXT,
    "createdByEmail" TEXT,
    "paidAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingLedger" (
    "id" TEXT NOT NULL,
    "type" "HostingLedgerType" NOT NULL,
    "amountRub" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "paymentId" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostingLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostingPayment_externalId_key" ON "HostingPayment"("externalId");

-- CreateIndex
CREATE INDEX "HostingPayment_status_idx" ON "HostingPayment"("status");

-- CreateIndex
CREATE INDEX "HostingPayment_createdAt_idx" ON "HostingPayment"("createdAt");

-- CreateIndex
CREATE INDEX "HostingLedger_createdAt_idx" ON "HostingLedger"("createdAt");

-- Initial balance: 30 days prepaid so deploy does not take the site offline immediately
INSERT INTO "HostingBalance" ("id", "balanceRub", "dailyRateRub", "manualSiteEnabled", "updatedAt")
VALUES ('singleton', 660, 22, true, CURRENT_TIMESTAMP);
