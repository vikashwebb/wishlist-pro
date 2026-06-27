-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN "smartRecoveryEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ShopSettings" ADD COLUMN "smartRecoveryDelayDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "ShopSettings" ADD COLUMN "smartPriceAlertsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ShopSettings" ADD COLUMN "smartPriceDropMinPercent" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "ShopSettings" ADD COLUMN "smartRestockAlertsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "customerId" TEXT,
    "productId" TEXT,
    "variantId" TEXT,
    "handle" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "AlertEvent_shop_alertType_status_idx" ON "AlertEvent"("shop", "alertType", "status");
