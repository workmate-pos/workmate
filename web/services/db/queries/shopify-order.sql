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
       INNER JOIN "WorkOrderItem"
                  ON "ShopifyOrderLineItem"."lineItemId" = "WorkOrderItem"."shopifyOrderLineItemId"
       INNER JOIN "WorkOrder" ON "WorkOrderItem"."workOrderId" = "WorkOrder"."id"
WHERE "ShopifyOrder"."orderId" = :orderId!;

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
