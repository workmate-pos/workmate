/*
  Warnings:

  - You are about to drop the column `shopifyOrderLineItemId` on the `PurchaseOrderLineItem` table. All the data in the column will be lost.

*/

-- TODO: TEst!

-- We no longer support connecting POs directly to SOs, so migrate previous PO line item <-> SO line item relationships to special order line items.
-- We first create a special order for every Purchase Order * Customer combination.
-- Then we create special order line items for every purchase order line item connected to a shopify order with a customer.

-- There are a couple of POs with SO links that we cannot migrate, so those will simply be unlinked.

ALTER TABLE "PurchaseOrderLineItem"
  DROP CONSTRAINT "PurchaseOrderLineItem_shopifyOrderLineItemId_fkey";


-- DropForeignKey
WITH -- Create a special order for every PO x SO combination
     "POSO" AS (SELECT po.shop,
                       po.name,
                       po.id,
                       so."orderId",
                       so."customerId",
                       po."locationId",
                       ROW_NUMBER() OVER (PARTITION BY po.shop ORDER BY po.id ASC) AS "shop_po_idx"
                FROM "PurchaseOrder" po
                       INNER JOIN "PurchaseOrderLineItem" poli ON poli."purchaseOrderId" = po.id
                       INNER JOIN "ShopifyOrderLineItem" soli ON soli."lineItemId" = poli."shopifyOrderLineItemId"
                       INNER JOIN "ShopifyOrder" so ON so."orderId" = soli."orderId"
                WHERE so."customerId" IS NOT NULL
                  AND so."customerId" IS NOT NULL
                  AND poli."shopifyOrderLineItemId" IS NOT NULL
                GROUP BY po.id, so."orderId"),
     "PurchaseOrderSpecialOrders" AS (
       INSERT INTO "SpecialOrder" (shop, name, "customerId", "locationId", "companyId", "companyContactId",
                                   "companyLocationId", "requiredBy", note)
         SELECT poso.shop
              , 'SPO-#' || poso.shop_po_idx
              , poso."customerId"
              , poso."locationId"
              , NULL
              , NULL
              , NULL
              , NULL
              , 'This special order was automatically created for ' || poso.name || '.'
         FROM "POSO" poso
         RETURNING *),
-- Create special order line items for purchase order line items (one per PO line item)
     "SpecialOrderLineItems" AS (
       INSERT
         INTO "SpecialOrderLineItem" ("specialOrderId", uuid, "shopifyOrderLineItemId", "productVariantId", quantity)
           SELECT spo.id, poli.uuid, poli."shopifyOrderLineItemId", poli."productVariantId", poli.quantity
           FROM "PurchaseOrderLineItem" poli
                  INNER JOIN "ShopifyOrderLineItem" soli ON soli."lineItemId" = poli."shopifyOrderLineItemId"
                  INNER JOIN "POSO" poso ON poso.id = poli."purchaseOrderId" AND poso."orderId" = soli."orderId"
                  INNER JOIN "PurchaseOrderSpecialOrders" spo
                             ON spo.shop = poso.shop AND spo.name = 'SPO-#' || poso.shop_po_idx
           RETURNING *)
-- Connect purchase order line items to the special order
UPDATE "PurchaseOrderLineItem" poli
SET "specialOrderLineItemId" = (SELECT x.id
                                FROM "SpecialOrderLineItems" x
                                       INNER JOIN "ShopifyOrderLineItem" soli
                                                  ON soli."lineItemId" = poli."shopifyOrderLineItemId"
                                       INNER JOIN "POSO" poso
                                                  ON poso.id = poli."purchaseOrderId" AND poso."orderId" = soli."orderId"
                                       INNER JOIN "PurchaseOrderSpecialOrders" spo
                                                  ON spo.shop = poso.shop AND spo.name = 'SPO-#' || poso.shop_po_idx
                                WHERE x.uuid = poli.uuid
                                  AND x."shopifyOrderLineItemId" = poli."shopifyOrderLineItemId"
                                  AND x."productVariantId" = poli."productVariantId"
                                  AND x.quantity = poli.quantity);

-- DropIndex
DROP INDEX "PurchaseOrderLineItem_shopifyOrderLineItemId_idx";

-- AlterTable
ALTER TABLE "PurchaseOrderLineItem"
  DROP COLUMN "shopifyOrderLineItemId";
