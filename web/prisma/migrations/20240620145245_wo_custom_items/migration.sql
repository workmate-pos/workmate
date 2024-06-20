-- AlterTable
ALTER TABLE "WorkOrderFixedPriceLabourCharge" ADD COLUMN     "workOrderCustomItemUuid" UUID;

-- AlterTable
ALTER TABLE "WorkOrderHourlyLabourCharge" ADD COLUMN     "workOrderCustomItemUuid" UUID;

-- CreateTable
CREATE TABLE "WorkOrderCustomItem" (
    "workOrderId" INTEGER NOT NULL,
    "uuid" UUID NOT NULL,
    "shopifyOrderLineItemId" TEXT,
    "name" TEXT NOT NULL,
    "unitPrice" TEXT NOT NULL,
    "absorbCharges" BOOLEAN NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderCustomItem_pkey" PRIMARY KEY ("workOrderId","uuid")
);

-- CreateTable
CREATE TABLE "WorkOrderCustomItemCustomField" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "workOrderCustomItemUuid" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderCustomItemCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkOrderCustomItem_shopifyOrderLineItemId_idx" ON "WorkOrderCustomItem"("shopifyOrderLineItemId");

-- CreateIndex
CREATE INDEX "WorkOrderCustomItemCustomField_key_value_idx" ON "WorkOrderCustomItemCustomField"("key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderCustomItemCustomField_workOrderId_workOrderCustomI_key" ON "WorkOrderCustomItemCustomField"("workOrderId", "workOrderCustomItemUuid", "key");

-- AddForeignKey
ALTER TABLE "WorkOrderCustomItem" ADD CONSTRAINT "WorkOrderCustomItem_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCustomItem" ADD CONSTRAINT "WorkOrderCustomItem_shopifyOrderLineItemId_fkey" FOREIGN KEY ("shopifyOrderLineItemId") REFERENCES "ShopifyOrderLineItem"("lineItemId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderFixedPriceLabourCharge" ADD CONSTRAINT "WorkOrderFixedPriceLabourCharge_workOrderId_workOrderCusto_fkey" FOREIGN KEY ("workOrderId", "workOrderCustomItemUuid") REFERENCES "WorkOrderCustomItem"("workOrderId", "uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderHourlyLabourCharge" ADD CONSTRAINT "WorkOrderHourlyLabourCharge_workOrderId_workOrderCustomIte_fkey" FOREIGN KEY ("workOrderId", "workOrderCustomItemUuid") REFERENCES "WorkOrderCustomItem"("workOrderId", "uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCustomItemCustomField" ADD CONSTRAINT "WorkOrderCustomItemCustomField_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCustomItemCustomField" ADD CONSTRAINT "WorkOrderCustomItemCustomField_workOrderId_workOrderCustom_fkey" FOREIGN KEY ("workOrderId", "workOrderCustomItemUuid") REFERENCES "WorkOrderCustomItem"("workOrderId", "uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
