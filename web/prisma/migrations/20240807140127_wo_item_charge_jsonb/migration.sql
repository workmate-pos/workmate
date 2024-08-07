/*
  Warnings:

  - You are about to drop the `WorkOrderCustomItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkOrderCustomItemCustomField` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkOrderFixedPriceLabourCharge` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkOrderHourlyLabourCharge` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkOrderItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateTable
CREATE TABLE "New_WorkOrderItem"
(
  "workOrderId"            INTEGER        NOT NULL,
  "uuid"                   UUID           NOT NULL,
  "shopifyOrderLineItemId" TEXT,
  "data"                   JSONB          NOT NULL,
  "createdAt"              TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "New_WorkOrderItem_pkey" PRIMARY KEY ("workOrderId", "uuid")
);

-- CreateTable
CREATE TABLE "WorkOrderCharge"
(
  "workOrderId"            INTEGER        NOT NULL,
  "uuid"                   UUID           NOT NULL,
  "shopifyOrderLineItemId" TEXT,
  "workOrderItemUuid"      UUID,
  "data"                   JSONB          NOT NULL,
  "createdAt"              TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkOrderCharge_pkey" PRIMARY KEY ("workOrderId", "uuid")
);

-- CreateIndex
CREATE INDEX "New_WorkOrderItem_shopifyOrderLineItemId_idx" ON "New_WorkOrderItem" ("shopifyOrderLineItemId");

-- CreateIndex
CREATE INDEX "WorkOrderCharge_shopifyOrderLineItemId_idx" ON "WorkOrderCharge" ("shopifyOrderLineItemId");

-- AddForeignKey
ALTER TABLE "New_WorkOrderItem"
  ADD CONSTRAINT "New_WorkOrderItem_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "New_WorkOrderItem"
  ADD CONSTRAINT "New_WorkOrderItem_shopifyOrderLineItemId_fkey" FOREIGN KEY ("shopifyOrderLineItemId") REFERENCES "ShopifyOrderLineItem" ("lineItemId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCharge"
  ADD CONSTRAINT "WorkOrderCharge_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCharge"
  ADD CONSTRAINT "WorkOrderCharge_shopifyOrderLineItemId_fkey" FOREIGN KEY ("shopifyOrderLineItemId") REFERENCES "ShopifyOrderLineItem" ("lineItemId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCharge"
  ADD CONSTRAINT "WorkOrderCharge_workOrderId_workOrderItemUuid_fkey" FOREIGN KEY ("workOrderId", "workOrderItemUuid") REFERENCES "New_WorkOrderItem" ("workOrderId", "uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderItemCustomField"
  ADD CONSTRAINT "New_WorkOrderItemCustomField_workOrderId_workOrderItemUuid_fkey" FOREIGN KEY ("workOrderId", "workOrderItemUuid") REFERENCES "New_WorkOrderItem" ("workOrderId", "uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- migrate items and charges to new jsonb table format
-- this new format makes the database schema far simpler.
-- to add new charge types or items types you can just extend the zod schema,
-- rather than having to add a new table for the item, and a new item for custom fields

-- type: 'product'
-- absorbCharges: boolean
-- quantity: int
-- productVariantId: string

INSERT INTO "New_WorkOrderItem" ("workOrderId", uuid, "shopifyOrderLineItemId", data, "createdAt", "updatedAt")
SELECT item."workOrderId",
       item.uuid,
       item."shopifyOrderLineItemId",
       jsonb_build_object(
         'type', 'product',
         'absorbCharges', item."absorbCharges",
         'quantity', item.quantity,
         'productVariantId', item."productVariantId"
       ),
       item."createdAt",
       item."updatedAt"
FROM "WorkOrderItem" item;

-- type: 'custom-item'
-- absorbCharges: boolean
-- quantity: int
-- name: string
-- unitPrice: string

INSERT INTO "New_WorkOrderItem" ("workOrderId", uuid, "shopifyOrderLineItemId", data, "createdAt", "updatedAt")
SELECT item."workOrderId",
       item.uuid,
       item."shopifyOrderLineItemId",
       jsonb_build_object(
         'type', 'custom-item',
         'absorbCharges', item."absorbCharges",
         'quantity', item.quantity,
         'name', item.name,
         'unitPrice', item."unitPrice"
       ),
       item."createdAt",
       item."updatedAt"
FROM "WorkOrderCustomItem" item;

-- type: 'hourly-labour'
-- employeeId: string | null
-- name: string
-- removeLocked: boolean
-- rate: string
-- hours: string
-- rateLocked: boolean
-- hoursLocked: boolean

INSERT INTO "WorkOrderCharge" ("workOrderId", uuid, "shopifyOrderLineItemId", "workOrderItemUuid", data, "createdAt", "updatedAt")
SELECT charge."workOrderId",
       charge.uuid,
       charge."shopifyOrderLineItemId",
       COALESCE(charge."workOrderItemUuid", charge."workOrderCustomItemUuid"),
       jsonb_build_object(
         'type', 'hourly-labour',
         'employeeId', charge."employeeId",
         'name', charge.name,
         'removeLocked', charge."removeLocked",
         'rate', charge."rate",
         'hours', charge."hours",
         'rateLocked', charge."rateLocked",
         'hoursLocked', charge."hoursLocked"
       ),
       charge."createdAt",
       charge."updatedAt"
FROM "WorkOrderHourlyLabourCharge" charge;

-- type: 'fixed-price-labour'
-- employeeId: string | null
-- name: string
-- removeLocked: boolean
-- amount: string
-- amountLocked: boolean

INSERT INTO "WorkOrderCharge" ("workOrderId", uuid, "shopifyOrderLineItemId", "workOrderItemUuid", data, "createdAt", "updatedAt")
SELECT charge."workOrderId",
       charge.uuid,
       charge."shopifyOrderLineItemId",
       COALESCE(charge."workOrderItemUuid", charge."workOrderCustomItemUuid"),
       jsonb_build_object(
         'type', 'hourly-labour',
         'employeeId', charge."employeeId",
         'name', charge.name,
         'removeLocked', charge."removeLocked",
         'amount', charge."amount",
         'amountLocked', charge."amountLocked"
       ),
       charge."createdAt",
       charge."updatedAt"
FROM "WorkOrderFixedPriceLabourCharge" charge;

-- DropForeignKey
ALTER TABLE "WorkOrderCustomItem"
  DROP CONSTRAINT "WorkOrderCustomItem_shopifyOrderLineItemId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderCustomItem"
  DROP CONSTRAINT "WorkOrderCustomItem_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderCustomItemCustomField"
  DROP CONSTRAINT "WorkOrderCustomItemCustomField_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderCustomItemCustomField"
  DROP CONSTRAINT "WorkOrderCustomItemCustomField_workOrderId_workOrderCustom_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderFixedPriceLabourCharge"
  DROP CONSTRAINT "WorkOrderFixedPriceLabourCharge_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderFixedPriceLabourCharge"
  DROP CONSTRAINT "WorkOrderFixedPriceLabourCharge_shopifyOrderLineItemId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderFixedPriceLabourCharge"
  DROP CONSTRAINT "WorkOrderFixedPriceLabourCharge_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderFixedPriceLabourCharge"
  DROP CONSTRAINT "WorkOrderFixedPriceLabourCharge_workOrderId_workOrderCusto_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderFixedPriceLabourCharge"
  DROP CONSTRAINT "WorkOrderFixedPriceLabourCharge_workOrderId_workOrderItemU_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderHourlyLabourCharge"
  DROP CONSTRAINT "WorkOrderHourlyLabourCharge_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderHourlyLabourCharge"
  DROP CONSTRAINT "WorkOrderHourlyLabourCharge_shopifyOrderLineItemId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderHourlyLabourCharge"
  DROP CONSTRAINT "WorkOrderHourlyLabourCharge_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderHourlyLabourCharge"
  DROP CONSTRAINT "WorkOrderHourlyLabourCharge_workOrderId_workOrderCustomIte_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderHourlyLabourCharge"
  DROP CONSTRAINT "WorkOrderHourlyLabourCharge_workOrderId_workOrderItemUuid_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderItem"
  DROP CONSTRAINT "WorkOrderItem_productVariantId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderItem"
  DROP CONSTRAINT "WorkOrderItem_shopifyOrderLineItemId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderItem"
  DROP CONSTRAINT "WorkOrderItem_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderItemCustomField"
  DROP CONSTRAINT "WorkOrderItemCustomField_workOrderId_workOrderItemUuid_fkey";

-- DropTable
DROP TABLE "WorkOrderCustomItem";

-- DropTable
DROP TABLE "WorkOrderCustomItemCustomField";

-- DropTable
DROP TABLE "WorkOrderFixedPriceLabourCharge";

-- DropTable
DROP TABLE "WorkOrderHourlyLabourCharge";

-- DropTable
DROP TABLE "WorkOrderItem";


-- Remove all the New_ prefixes
ALTER TABLE "New_WorkOrderItem"
  RENAME CONSTRAINT "New_WorkOrderItem_pkey" TO "WorkOrderItem_pkey";
ALTER INDEX "New_WorkOrderItem_shopifyOrderLineItemId_idx" RENAME TO "WorkOrderItem_shopifyOrderLineItemId_idx";
ALTER TABLE "New_WorkOrderItem"
  RENAME CONSTRAINT "New_WorkOrderItem_workOrderId_fkey" TO "WorkOrderItem_workOrderId_fkey";
ALTER TABLE "New_WorkOrderItem"
  RENAME CONSTRAINT "New_WorkOrderItem_shopifyOrderLineItemId_fkey" TO "WorkOrderItem_shopifyOrderLineItemId_fkey";
ALTER TABLE "WorkOrderItemCustomField"
  RENAME CONSTRAINT "New_WorkOrderItemCustomField_workOrderId_workOrderItemUuid_fkey" TO "WorkOrderItemCustomField_workOrderId_workOrderItemUuid_fkey";
ALTER TABLE "New_WorkOrderItem"
  RENAME TO "WorkOrderItem";

-- Create updated at triggers
CREATE TRIGGER "WorkOrderItem_updatedAt"
  BEFORE UPDATE
  ON "WorkOrderItem"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "WorkOrderCharge_updatedAt"
  BEFORE UPDATE
  ON "WorkOrderCharge"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
