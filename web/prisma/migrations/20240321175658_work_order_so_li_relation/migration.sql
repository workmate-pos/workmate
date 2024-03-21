/*
  Warnings:

  - The primary key for the `Employee` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `employeeId` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `locationName` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `orderName` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `vendorCustomerId` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `workOrderName` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `employeeName` on the `PurchaseOrderEmployeeAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `draftOrderId` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the `FixedPriceLabour` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HourlyLabour` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PurchaseOrderCustomFieldsPreset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PurchaseOrderProduct` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `staffMemberId` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `PurchaseOrder` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `shipFrom` on table `PurchaseOrder` required. This step will fail if there are existing NULL values in that column.
  - Made the column `shipTo` on table `PurchaseOrder` required. This step will fail if there are existing NULL values in that column.
  - Made the column `note` on table `PurchaseOrder` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `note` to the `WorkOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ShopifyOrderType" AS ENUM ('ORDER', 'DRAFT_ORDER');

-- CreateEnum
CREATE TYPE "CustomFieldsPresetType" AS ENUM ('WORK_ORDER', 'PURCHASE_ORDER');

-- OLD WORK ORDER
ALTER TABLE "WorkOrder" RENAME TO "OldWorkOrder";
ALTER TABLE "OldWorkOrder" RENAME CONSTRAINT "WorkOrder_pkey" TO "OldWorkOrder_pkey";
ALTER INDEX "WorkOrder_shop_name_key" RENAME TO "OldWorkOrder_shop_name_key";
ALTER INDEX "WorkOrder_draftOrderId_idx" RENAME TO "OldWorkOrder_draftOrderId_idx";
ALTER INDEX "WorkOrder_orderId_idx" RENAME TO "OldWorkOrder_orderId_idx";


-- OLD FIXED PRICE LABOUR
ALTER TABLE "FixedPriceLabour" RENAME TO "OldFixedPriceLabour";
ALTER TABLE "OldFixedPriceLabour" RENAME CONSTRAINT "FixedPriceLabour_workOrderId_fkey" TO "OldFixedPriceLabour_workOrderId_fkey";
ALTER INDEX "FixedPriceLabour_workOrderId_idx" RENAME TO "OldFixedPriceLabour_workOrderId_idx";
ALTER TABLE "OldFixedPriceLabour" RENAME CONSTRAINT "FixedPriceLabour_pkey" TO "OldFixedPriceLabour_pkey";

-- OLD HOURLY LABOUR
ALTER TABLE "HourlyLabour" RENAME TO "OldHourlyLabour";
ALTER TABLE "OldHourlyLabour" RENAME CONSTRAINT "HourlyLabour_workOrderId_fkey" TO "OldHourlyLabour_workOrderId_fkey";
ALTER INDEX "HourlyLabour_workOrderId_idx" RENAME TO "OldHourlyLabour_workOrderId_idx";
ALTER TABLE "OldHourlyLabour" RENAME CONSTRAINT "HourlyLabour_pkey" TO "OldHourlyLabour_pkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_shop_workOrderName_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrderProduct" DROP CONSTRAINT "PurchaseOrderProduct_purchaseOrderId_fkey";

-- AlterTable
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_pkey",
DROP COLUMN "employeeId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "staffMemberId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT "Employee_pkey" PRIMARY KEY ("staffMemberId");

-- AlterTable
ALTER TABLE "PurchaseOrder" DROP COLUMN "customerId",
DROP COLUMN "customerName",
DROP COLUMN "locationName",
DROP COLUMN "orderId",
DROP COLUMN "orderName",
DROP COLUMN "vendorCustomerId",
DROP COLUMN "workOrderName",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL,
ALTER COLUMN "shipFrom" SET NOT NULL,
ALTER COLUMN "shipTo" SET NOT NULL,
ALTER COLUMN "note" SET NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseOrderCustomField" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PurchaseOrderEmployeeAssignment" DROP COLUMN "employeeName",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;




-- DropEnum
DROP TYPE "PurchaseOrderStatus";

CREATE TABLE "WorkOrder" (
  id SERIAL NOT NULL,
  "shop" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "derivedFromOrderId" TEXT,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "note" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderItem" (
    "workOrderId" INTEGER NOT NULL,
    "uuid" UUID NOT NULL,
    "shopifyOrderLineItemId" TEXT,
    "productVariantId" TEXT NOT NULL,
    "absorbCharges" BOOLEAN NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderItem_pkey" PRIMARY KEY ("workOrderId","uuid")
);

-- CreateTable
CREATE TABLE "WorkOrderFixedPriceLabourCharge" (
    "workOrderId" INTEGER NOT NULL,
    "uuid" UUID NOT NULL,
    "workOrderItemUuid" UUID,
    "shopifyOrderLineItemId" TEXT,
    "employeeId" TEXT,
    "name" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderFixedPriceLabourCharge_pkey" PRIMARY KEY ("workOrderId","uuid")
);

-- CreateTable
CREATE TABLE "WorkOrderHourlyLabourCharge" (
    "workOrderId" INTEGER NOT NULL,
    "uuid" UUID NOT NULL,
    "workOrderItemUuid" UUID,
    "shopifyOrderLineItemId" TEXT,
    "employeeId" TEXT,
    "name" TEXT NOT NULL,
    "rate" TEXT NOT NULL,
    "hours" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderHourlyLabourCharge_pkey" PRIMARY KEY ("workOrderId","uuid")
);

-- CreateTable
CREATE TABLE "ShopifyOrder" (
    "orderId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "orderType" "ShopifyOrderType" NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT,
    "total" TEXT NOT NULL,
    "outstanding" TEXT NOT NULL,
    "fullyPaid" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopifyOrder_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "ShopifyOrderLineItem" (
    "lineItemId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unfulfilledQuantity" INTEGER NOT NULL,
    "discountedUnitPrice" TEXT NOT NULL,
    "unitPrice" TEXT NOT NULL,
    "totalTax" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopifyOrderLineItem_pkey" PRIMARY KEY ("lineItemId")
);

-- CreateTable
CREATE TABLE "WorkOrderCustomField" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldsPreset" (
    "id" SERIAL NOT NULL,
    "type" "CustomFieldsPresetType" NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomFieldsPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "productVariantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "sku" TEXT,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("productVariantId")
);

-- CreateTable
CREATE TABLE "Product" (
    "productId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "Customer" (
    "customerId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable
CREATE TABLE "Location" (
    "locationId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Location_pkey" PRIMARY KEY ("locationId")
);


-- CreateIndex
CREATE INDEX "WorkOrderItem_shopifyOrderLineItemId_idx" ON "WorkOrderItem"("shopifyOrderLineItemId");

-- CreateIndex
CREATE INDEX "ShopifyOrder_shop_idx" ON "ShopifyOrder"("shop");

-- CreateIndex
CREATE INDEX "ShopifyOrderLineItem_orderId_idx" ON "ShopifyOrderLineItem"("orderId");

-- CreateIndex
CREATE INDEX "WorkOrderCustomField_key_value_idx" ON "WorkOrderCustomField"("key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderCustomField_workOrderId_key_key" ON "WorkOrderCustomField"("workOrderId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldsPreset_shop_type_name_key" ON "CustomFieldsPreset"("shop", "type", "name");

-- CreateIndex
CREATE INDEX "Product_shop_idx" ON "Product"("shop");

-- CreateIndex
CREATE INDEX "Customer_shop_idx" ON "Customer"("shop");

-- CreateIndex
CREATE INDEX "Location_shop_idx" ON "Location"("shop");

-- CreateIndex
CREATE INDEX "Employee_shop_idx" ON "Employee"("shop");

-- CreateIndex
CREATE INDEX "PurchaseOrderCustomField_key_value_idx" ON "PurchaseOrderCustomField"("key", "value");

ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("customerId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_derivedFromOrderId_fkey" FOREIGN KEY ("derivedFromOrderId") REFERENCES "ShopifyOrder"("orderId") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "WorkOrder_shop_name_key" ON "WorkOrder"("shop", "name");


-- AddForeignKey
ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_shopifyOrderLineItemId_fkey" FOREIGN KEY ("shopifyOrderLineItemId") REFERENCES "ShopifyOrderLineItem"("lineItemId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("productVariantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderFixedPriceLabourCharge" ADD CONSTRAINT "WorkOrderFixedPriceLabourCharge_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderFixedPriceLabourCharge" ADD CONSTRAINT "WorkOrderFixedPriceLabourCharge_workOrderId_workOrderItemU_fkey" FOREIGN KEY ("workOrderId", "workOrderItemUuid") REFERENCES "WorkOrderItem"("workOrderId", "uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderFixedPriceLabourCharge" ADD CONSTRAINT "WorkOrderFixedPriceLabourCharge_shopifyOrderLineItemId_fkey" FOREIGN KEY ("shopifyOrderLineItemId") REFERENCES "ShopifyOrderLineItem"("lineItemId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderFixedPriceLabourCharge" ADD CONSTRAINT "WorkOrderFixedPriceLabourCharge_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("staffMemberId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderHourlyLabourCharge" ADD CONSTRAINT "WorkOrderHourlyLabourCharge_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderHourlyLabourCharge" ADD CONSTRAINT "WorkOrderHourlyLabourCharge_workOrderId_workOrderItemUuid_fkey" FOREIGN KEY ("workOrderId", "workOrderItemUuid") REFERENCES "WorkOrderItem"("workOrderId", "uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderHourlyLabourCharge" ADD CONSTRAINT "WorkOrderHourlyLabourCharge_shopifyOrderLineItemId_fkey" FOREIGN KEY ("shopifyOrderLineItemId") REFERENCES "ShopifyOrderLineItem"("lineItemId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderHourlyLabourCharge" ADD CONSTRAINT "WorkOrderHourlyLabourCharge_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("staffMemberId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyOrder" ADD CONSTRAINT "ShopifyOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("customerId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyOrderLineItem" ADD CONSTRAINT "ShopifyOrderLineItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopifyOrder"("orderId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyOrderLineItem" ADD CONSTRAINT "ShopifyOrderLineItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("productVariantId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("locationId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderEmployeeAssignment" ADD CONSTRAINT "PurchaseOrderEmployeeAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("staffMemberId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCustomField" ADD CONSTRAINT "WorkOrderCustomField_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE RESTRICT ON UPDATE CASCADE;


INSERT INTO "CustomFieldsPreset" (type, shop, name, keys)
SELECT 'PURCHASE_ORDER', shop, name, keys
FROM "PurchaseOrderCustomFieldsPreset";

-- DropTable
DROP TABLE "PurchaseOrderCustomFieldsPreset";


ALTER TABLE "PurchaseOrderProduct" RENAME TO "PurchaseOrderLineItem";
ALTER TABLE "PurchaseOrderLineItem" RENAME CONSTRAINT "PurchaseOrderProduct_pkey" TO "PurchaseOrderLineItem_pkey";
ALTER TABLE "PurchaseOrderLineItem" DROP COLUMN "handle",
                                    DROP COLUMN "inventoryItemId",
                                    DROP COLUMN "name",
                                    DROP COLUMN "sku",
                                    ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                    ADD COLUMN     "shopifyOrderLineItemId" TEXT,
                                    ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "PurchaseOrderLineItem_shopifyOrderLineItemId_idx" ON "PurchaseOrderLineItem"("shopifyOrderLineItemId");
ALTER TABLE "PurchaseOrderLineItem" ADD CONSTRAINT "PurchaseOrderLineItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLineItem" ADD CONSTRAINT "PurchaseOrderLineItem_shopifyOrderLineItemId_fkey" FOREIGN KEY ("shopifyOrderLineItemId") REFERENCES "ShopifyOrderLineItem"("lineItemId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLineItem" ADD CONSTRAINT "PurchaseOrderLineItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("productVariantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER INDEX "PurchaseOrderProduct_purchaseOrderId_idx" RENAME TO "PurchaseOrderLineItem_purchaseOrderId_idx";
