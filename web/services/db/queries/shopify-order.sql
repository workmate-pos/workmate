/* @name get */
SELECT *
FROM "ShopifyOrder"
WHERE "orderId" = :orderId!;

/*
  @name getMany
  @param orderIds -> (...)
*/
SELECT *
FROM "ShopifyOrder"
WHERE "orderId" IN :orderIds!;

/* @name upsert */
INSERT INTO "ShopifyOrder" ("orderId", shop, "orderType", name, "customerId", subtotal, discount, total, outstanding,
                            "fullyPaid")
VALUES (:orderId!, :shop!, :orderType!, :name!, :customerId, :subtotal!, :discount!, :total!, :outstanding!,
        :fullyPaid!)
ON CONFLICT ("orderId") DO UPDATE
  SET shop         = EXCLUDED.shop,
      "orderType"  = EXCLUDED."orderType",
      name         = EXCLUDED.name,
      "customerId" = EXCLUDED."customerId",
      subtotal     = EXCLUDED.subtotal,
      discount     = EXCLUDED.discount,
      total        = EXCLUDED.total,
      outstanding  = EXCLUDED.outstanding,
      "fullyPaid"  = EXCLUDED."fullyPaid";

/* @name getLineItems */
SELECT *
FROM "ShopifyOrderLineItem"
WHERE "orderId" = :orderId!;

/*
  @name getLineItemsByIds
  @param lineItemIds -> (...)
*/
SELECT *
FROM "ShopifyOrderLineItem"
WHERE "lineItemId" IN :lineItemIds!;

/* @name upsertLineItem */
INSERT INTO "ShopifyOrderLineItem" ("lineItemId", "orderId", "productVariantId", quantity, "unitPrice",
                                    "unfulfilledQuantity", "title", "totalTax", "discountedUnitPrice")
VALUES (:lineItemId!, :orderId!, :productVariantId, :quantity!, :unitPrice!, :unfulfilledQuantity!, :title!, :totalTax!,
        :discountedUnitPrice!)
ON CONFLICT ("lineItemId") DO UPDATE
  SET "orderId"             = EXCLUDED."orderId",
      "productVariantId"    = EXCLUDED."productVariantId",
      quantity              = EXCLUDED.quantity,
      "unitPrice"           = EXCLUDED."unitPrice",
      "unfulfilledQuantity" = EXCLUDED."unfulfilledQuantity",
      "title"               = EXCLUDED.title,
      "totalTax"            = EXCLUDED."totalTax",
      "discountedUnitPrice" = EXCLUDED."discountedUnitPrice";

/*
  @name removeLineItemsByIds
  @param lineItemIds -> (...)
*/
DELETE
FROM "ShopifyOrderLineItem"
WHERE "lineItemId" IN :lineItemIds!;

/* @name getRelatedWorkOrdersByShopifyOrderId */
SELECT DISTINCT "WorkOrder"."id", "WorkOrder".name
FROM "ShopifyOrder"
       INNER JOIN "ShopifyOrderLineItem" ON "ShopifyOrder"."orderId" = "ShopifyOrderLineItem"."orderId"
       LEFT JOIN "WorkOrderItem"
                 ON "ShopifyOrderLineItem"."lineItemId" = "WorkOrderItem"."shopifyOrderLineItemId"
       LEFT JOIN "WorkOrderCharge"
                 ON "ShopifyOrderLineItem"."lineItemId" = "WorkOrderCharge"."shopifyOrderLineItemId"
       INNER JOIN "WorkOrder" ON ("WorkOrderItem"."workOrderId" = "WorkOrder"."id" OR
                                  "WorkOrderCharge"."workOrderId" = "WorkOrder"."id")
WHERE "ShopifyOrder"."orderId" = :orderId!;

/* @name getLinkedOrdersByWorkOrderId */
SELECT DISTINCT so.*
FROM "WorkOrder" wo
       LEFT JOIN "WorkOrderItem" woi ON wo.id = woi."workOrderId"
       LEFT JOIN "WorkOrderCharge" woc ON wo.id = woc."workOrderId"
       INNER JOIN "ShopifyOrderLineItem" soli ON (
  woi."shopifyOrderLineItemId" = soli."lineItemId"
    OR woc."shopifyOrderLineItemId" = soli."lineItemId"
  )
       INNER JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
WHERE wo.id = :workOrderId!;

/* @name getLinkedOrdersByPurchaseOrderId */
SELECT DISTINCT "ShopifyOrder".*
FROM "ShopifyOrder"
       INNER JOIN "ShopifyOrderLineItem" ON "ShopifyOrder"."orderId" = "ShopifyOrderLineItem"."orderId"
       INNER JOIN "PurchaseOrderLineItem"
                  ON "ShopifyOrderLineItem"."lineItemId" = "PurchaseOrderLineItem"."shopifyOrderLineItemId"
WHERE "PurchaseOrderLineItem"."purchaseOrderId" = :purchaseOrderId!;

/*
  @name deleteOrders
  @param orderIds -> (...)
*/
DELETE
FROM "ShopifyOrder"
WHERE "orderId" IN :orderIds!;

/*
  @name deleteLineItemsByOrderIds
  @param orderIds -> (...)
*/
DELETE
FROM "ShopifyOrderLineItem"
WHERE "orderId" IN :orderIds!;
