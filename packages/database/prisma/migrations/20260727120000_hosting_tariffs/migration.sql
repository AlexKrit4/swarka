-- CreateTable
CREATE TABLE "HostingTariff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "cpuLabel" TEXT NOT NULL,
    "ramLabel" TEXT NOT NULL,
    "storageLabel" TEXT NOT NULL,
    "extrasLabel" TEXT NOT NULL DEFAULT '',
    "dailyRateRub" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingTariff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HostingTariff_sortOrder_idx" ON "HostingTariff"("sortOrder");

-- CreateIndex
CREATE INDEX "HostingTariff_isActive_idx" ON "HostingTariff"("isActive");

-- AlterTable
ALTER TABLE "HostingBalance" ADD COLUMN "tariffId" TEXT;

-- Seed default tariffs
INSERT INTO "HostingTariff" ("id", "name", "tagline", "cpuLabel", "ramLabel", "storageLabel", "extrasLabel", "dailyRateRub", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
  ('tariff_basic', 'Базовый', 'Сайт работает стабильно', '2 ядра', '2 ГБ RAM', 'SSD 20 ГБ', '', 22, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tariff_standard', 'Стандарт', 'Быстрее открывается, запас под пики', '4 ядра', '4 ГБ RAM', 'SSD 40 ГБ', '', 35, 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tariff_pro', 'Про', 'Для рекламы и большой нагрузки', '6 ядер', '8 ГБ RAM', 'SSD 80 ГБ', 'Приоритет', 55, 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tariff_max', 'Максимум', 'Как у серьёзного хостинга', '8 ядер', '16 ГБ RAM', 'SSD 160 ГБ', 'Резерв питания', 80, 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Link existing balance to Базовый if present
UPDATE "HostingBalance"
SET "tariffId" = 'tariff_basic'
WHERE "id" = 'singleton' AND "tariffId" IS NULL;

-- AddForeignKey
ALTER TABLE "HostingBalance" ADD CONSTRAINT "HostingBalance_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "HostingTariff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
