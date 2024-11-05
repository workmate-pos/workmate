/*
  Warnings:

  - You are about to drop the column `availableQuantity` on the `PurchaseOrderLineItem` table. All the data in the column will be lost.

*/

-- CreateTable
CREATE TABLE "PurchaseOrderReceipt"
(
  "id"              SERIAL         NOT NULL,
  "name"            TEXT           NOT NULL,
  "description"     TEXT           NOT NULL,
  "purchaseOrderId" INTEGER        NOT NULL,
  "createdAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PurchaseOrderReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderReceiptLineItem"
(
  "id"                     SERIAL         NOT NULL,
  "quantity"               INTEGER        NOT NULL,
  "purchaseOrderReceiptId" INTEGER        NOT NULL,
  "purchaseOrderId"        INTEGER        NOT NULL,
  "lineItemUuid"           UUID           NOT NULL,
  "createdAt"              TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PurchaseOrderReceiptLineItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PurchaseOrderReceipt"
  ADD CONSTRAINT "PurchaseOrderReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderReceiptLineItem"
  ADD CONSTRAINT "PurchaseOrderReceiptLineItem_purchaseOrderReceiptId_fkey" FOREIGN KEY ("purchaseOrderReceiptId") REFERENCES "PurchaseOrderReceipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderReceiptLineItem"
  ADD CONSTRAINT "PurchaseOrderReceiptLineItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderReceiptLineItem"
  ADD CONSTRAINT "PurchaseOrderReceiptLineItem_purchaseOrderId_lineItemUuid_fkey" FOREIGN KEY ("purchaseOrderId", "lineItemUuid") REFERENCES "PurchaseOrderLineItem" ("purchaseOrderId", "uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "PurchaseOrderReceipt"
  ADD COLUMN "shop" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderReceipt_shop_name_key" ON "PurchaseOrderReceipt" ("shop", "name");


-- Make receipts for every purchase order with availableQuantity

WITH "EligiblePurchaseOrder" AS (SELECT po.*,
                                        ROW_NUMBER() OVER (PARTITION BY po.shop ORDER BY po."createdAt" ASC) AS "rowNumber"
                                 FROM "PurchaseOrder" po
                                 WHERE EXISTS (SELECT 1
                                               FROM "PurchaseOrderLineItem" poli
                                               WHERE poli."purchaseOrderId" = po.id
                                                 AND poli."availableQuantity" > 0)),
     "Receipt" AS (
       INSERT INTO "PurchaseOrderReceipt" (shop, name, description, "purchaseOrderId")
         SELECT po.shop, 'PO-RCPT-#' || po."rowNumber", '', po.id
         FROM "EligiblePurchaseOrder" po
         RETURNING *),
     "UpdateCounters" AS (
       INSERT INTO "Counter" (key, last_value)
         SELECT 'purchase-order-receipt.' || po.shop, MAX(po."rowNumber")
         FROM "EligiblePurchaseOrder" po
         GROUP BY po.shop)
INSERT
INTO "PurchaseOrderReceiptLineItem" (quantity, "purchaseOrderReceiptId", "purchaseOrderId", "lineItemUuid")
SELECT poli."availableQuantity",
       (SELECT id FROM "Receipt" r WHERE r."purchaseOrderId" = poli."purchaseOrderId"),
       poli."purchaseOrderId",
       poli.uuid
FROM "PurchaseOrderLineItem" poli
WHERE poli."availableQuantity" > 0;

-- AlterTable
ALTER TABLE "PurchaseOrderLineItem"
  DROP COLUMN "availableQuantity";

CREATE TRIGGER "PurchaseOrderReceipt_updatedAt"
  BEFORE UPDATE
  ON "PurchaseOrderReceipt"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "PurchaseOrderReceiptLineItem_updatedAt"
  BEFORE UPDATE
  ON "PurchaseOrderReceiptLineItem"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
