/*
  Warnings:

  - You are about to drop the column `productVariantSerialId` on the `WorkOrder` table. All the data in the column will be lost.

*/

-- AlterTable
ALTER TABLE "WorkOrderItem"
  ADD COLUMN "productVariantSerialId" INTEGER;

-- AddForeignKey
ALTER TABLE "WorkOrderItem"
  ADD CONSTRAINT "WorkOrderItem_productVariantSerialId_fkey" FOREIGN KEY ("productVariantSerialId") REFERENCES "ProductVariantSerial" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "WorkOrderItem"
SET "productVariantSerialId" = "WorkOrder"."productVariantSerialId"
FROM "WorkOrder"
WHERE "WorkOrder"."id" = "WorkOrderItem"."workOrderId";

-- DropForeignKey
ALTER TABLE "WorkOrder"
  DROP CONSTRAINT "WorkOrder_productVariantSerialId_fkey";

-- AlterTable
ALTER TABLE "WorkOrder"
  DROP COLUMN "productVariantSerialId";
