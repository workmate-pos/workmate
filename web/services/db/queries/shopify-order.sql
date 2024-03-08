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
INSERT INTO "ShopifyOrder" ("orderId", shop, "orderType", name, "fullyPaid")
VALUES (:orderId!, :shop!, :orderType!, :name!, :fullyPaid!)
ON CONFLICT ("orderId") DO UPDATE
  SET shop        = :shop!,
      "orderType" = :orderType!,
      name        = :name!,
      "fullyPaid" = :fullyPaid!;

/* @name getLineItems */
SELECT *
FROM "ShopifyOrderLineItem"
WHERE "orderId" = :orderId!;

/* @name upsertLineItem */
INSERT INTO "ShopifyOrderLineItem" ("lineItemId", "orderId", "productVariantId", quantity, "unitPrice",
                                    "unfulfilledQuantity", "title")
VALUES (:lineItemId!, :orderId!, :productVariantId, :quantity!, :unitPrice!, :unfulfilledQuantity!, :title!)
ON CONFLICT ("lineItemId") DO UPDATE
  SET "orderId"             = :orderId!,
      "productVariantId"    = :productVariantId,
      quantity              = :quantity!,
      "unitPrice"           = :unitPrice!,
      "unfulfilledQuantity" = :unfulfilledQuantity!,
      "title"               = :title!;

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
SELECT DISTINCT "ShopifyOrder".*
FROM "ShopifyOrder"
       INNER JOIN "ShopifyOrderLineItem" ON "ShopifyOrder"."orderId" = "ShopifyOrderLineItem"."orderId"
       LEFT JOIN "WorkOrderItem" ON ("ShopifyOrderLineItem"."lineItemId" = "WorkOrderItem"."shopifyOrderLineItemId" AND
                                     "WorkOrderItem"."workOrderId" = :workOrderId!)
       LEFT JOIN "WorkOrderHourlyLabourCharge"
                 ON ("ShopifyOrderLineItem"."lineItemId" = "WorkOrderHourlyLabourCharge"."shopifyOrderLineItemId" AND
                     "WorkOrderHourlyLabourCharge"."workOrderId" = :workOrderId!)
       LEFT JOIN "WorkOrderFixedPriceLabourCharge"
                 ON ("ShopifyOrderLineItem"."lineItemId" = "WorkOrderFixedPriceLabourCharge"."shopifyOrderLineItemId" AND
                     "WorkOrderFixedPriceLabourCharge"."workOrderId" = :workOrderId!)
WHERE "WorkOrderItem"."uuid" IS NOT NULL
   OR "WorkOrderHourlyLabourCharge"."uuid" IS NOT NULL
   OR "WorkOrderFixedPriceLabourCharge"."uuid" IS NOT NULL;

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
