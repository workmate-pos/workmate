-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "locationId" TEXT;

-- CreateIndex
CREATE INDEX "WorkOrder_shop_locationId_idx" ON "WorkOrder"("shop", "locationId");

-- CreateIndex
CREATE INDEX "WorkOrder_shop_customerId_idx" ON "WorkOrder"("shop", "customerId");

-- CreateIndex
CREATE INDEX "WorkOrder_shop_status_idx" ON "WorkOrder"("shop", "status");
