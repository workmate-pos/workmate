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
INSERT INTO "ShopifyOrder" ("orderId", shop, "orderType", name, "customerId", total, outstanding)
VALUES (:orderId!, :shop!, :orderType!, :name!, :customerId, :total!, :outstanding!)
ON CONFLICT ("orderId") DO UPDATE
  SET shop         = :shop!,
      "orderType"  = :orderType!,
      name         = :name!,
      "customerId" = :customerId,
      total        = :total!,
      outstanding  = :outstanding!;

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
  SET "orderId"             = :orderId!,
      "productVariantId"    = :productVariantId,
      quantity              = :quantity!,
      "unitPrice"           = :unitPrice!,
      "unfulfilledQuantity" = :unfulfilledQuantity!,
      "title"               = :title!,
      "totalTax"            = :totalTax!,
      "discountedUnitPrice" = :discountedUnitPrice!;

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
       LEFT JOIN "WorkOrderHourlyLabourCharge"
                 ON "ShopifyOrderLineItem"."lineItemId" = "WorkOrderHourlyLabourCharge"."shopifyOrderLineItemId"
       LEFT JOIN "WorkOrderFixedPriceLabourCharge"
                 ON "ShopifyOrderLineItem"."lineItemId" = "WorkOrderFixedPriceLabourCharge"."shopifyOrderLineItemId"
       INNER JOIN "WorkOrder" ON ("WorkOrderItem"."workOrderId" = "WorkOrder"."id" OR
                                  "WorkOrderHourlyLabourCharge"."workOrderId" = "WorkOrder"."id" OR
                                  "WorkOrderFixedPriceLabourCharge"."workOrderId" = "WorkOrder"."id")
WHERE "ShopifyOrder"."orderId" = :orderId!;

/* @name getLinkedOrdersByWorkOrderId */
SELECT DISTINCT so.*
FROM "WorkOrder" wo
       LEFT JOIN "WorkOrderItem" woi ON wo.id = woi."workOrderId"
       LEFT JOIN "WorkOrderHourlyLabourCharge" hlc ON wo.id = hlc."workOrderId"
       LEFT JOIN "WorkOrderFixedPriceLabourCharge" fplc ON wo.id = fplc."workOrderId"
       INNER JOIN "ShopifyOrderLineItem" soli ON (
  woi."shopifyOrderLineItemId" = soli."lineItemId"
    OR hlc."shopifyOrderLineItemId" = soli."lineItemId"
    OR fplc."shopifyOrderLineItemId" = soli."lineItemId"
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
