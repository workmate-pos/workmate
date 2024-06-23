-- AlterEnum
ALTER TYPE "CustomFieldsPresetType" ADD VALUE 'LINE_ITEM';

-- CreateTable
CREATE TABLE "PurchaseOrderLineItemCustomField" (
    "id" SERIAL NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "purchaseOrderLineItemUuid" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderLineItemCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderItemCustomField" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "workOrderItemUuid" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderItemCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOrderLineItemCustomField_key_value_idx" ON "PurchaseOrderLineItemCustomField"("key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderLineItemCustomField_purchaseOrderId_purchaseOr_key" ON "PurchaseOrderLineItemCustomField"("purchaseOrderId", "purchaseOrderLineItemUuid", "key");

-- CreateIndex
CREATE INDEX "WorkOrderItemCustomField_key_value_idx" ON "WorkOrderItemCustomField"("key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderItemCustomField_workOrderId_workOrderItemUuid_key_key" ON "WorkOrderItemCustomField"("workOrderId", "workOrderItemUuid", "key");

-- AddForeignKey
ALTER TABLE "PurchaseOrderLineItemCustomField" ADD CONSTRAINT "PurchaseOrderLineItemCustomField_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLineItemCustomField" ADD CONSTRAINT "PurchaseOrderLineItemCustomField_purchaseOrderId_purchaseO_fkey" FOREIGN KEY ("purchaseOrderId", "purchaseOrderLineItemUuid") REFERENCES "PurchaseOrderLineItem"("purchaseOrderId", "uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderItemCustomField" ADD CONSTRAINT "WorkOrderItemCustomField_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderItemCustomField" ADD CONSTRAINT "WorkOrderItemCustomField_workOrderId_workOrderItemUuid_fkey" FOREIGN KEY ("workOrderId", "workOrderItemUuid") REFERENCES "WorkOrderItem"("workOrderId", "uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
