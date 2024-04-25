/* @name getAllOld */
SELECT *
FROM "OldWorkOrder";

/* @name getOldHourlyLabours */
SELECT *
FROM "OldHourlyLabour"
WHERE "workOrderId" = :workOrderId!;

/* @name getOldFixedPriceLabours */
SELECT *
FROM "OldFixedPriceLabour"
WHERE "workOrderId" = :workOrderId!;

/* @name removeOldWorkOrder */
DELETE
FROM "OldWorkOrder"
WHERE id = :workOrderId!;

/* @name removeOldHourlyLabour */
DELETE
FROM "OldHourlyLabour"
WHERE "workOrderId" = :workOrderId!;

/* @name removeOldFixedPriceLabour */
DELETE
FROM "OldFixedPriceLabour"
WHERE "workOrderId" = :workOrderId!;

/* @name createNewWorkOrder */
INSERT INTO "WorkOrder" (shop, name, "customerId", "derivedFromOrderId", "dueDate", note, status, "discountAmount", "discountType", "internalNote")
VALUES (:shop!, :name!, :customerId!, :derivedFromOrderId, :dueDate!, :note!, :status!, NULL, NULL, '')
RETURNING *;

/* @name createNewWorkOrderItem */
INSERT INTO "WorkOrderItem" ("workOrderId", uuid, "shopifyOrderLineItemId", "productVariantId", "absorbCharges", quantity)
VALUES (:workOrderId!, :uuid!, :shopifyOrderLineItemId, :productVariantId, :absorbCharges!, :quantity!)
RETURNING *;

/* @name createNewWorkOrderHourlyLabourCharge */
INSERT INTO "WorkOrderHourlyLabourCharge" ("workOrderId", uuid, "workOrderItemUuid", "shopifyOrderLineItemId", "employeeId", name, rate, hours, "hoursLocked", "rateLocked", "removeLocked")
VALUES (:workOrderId!, :uuid!, :workOrderItemUuid, :shopifyOrderLineItemId, :employeeId, :name, :rate, :hours, FALSE, FALSE, FALSE);

/* @name createNewWorkOrderFixedPriceLabourCharge */
INSERT INTO "WorkOrderFixedPriceLabourCharge" ("workOrderId", uuid, "workOrderItemUuid", "shopifyOrderLineItemId", "employeeId", name, amount, "amountLocked", "removeLocked")
VALUES (:workOrderId!, :uuid!, :workOrderItemUuid, :shopifyOrderLineItemId, :employeeId, :name, :amount, FALSE, FALSE);

/* @name getProductVariants */
SELECT *
FROM "ProductVariant";

/* @name getPurchaseOrders */
SELECT *
FROM "PurchaseOrder";

/* @name getPurchaseOrderLineItems */
SELECT *
FROM "PurchaseOrderLineItem"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name removePlaceholderProduct */
DELETE
FROM "Product"
WHERE "productId" = 'gid://shopify/Product/placeholder';

/* @name removePlaceholderProductVariants */
DELETE
FROM "ProductVariant"
WHERE "productId" = 'gid://shopify/Product/placeholder';

/* @name removeShopPurchaseOrderLineItems */
DELETE
FROM "PurchaseOrderLineItem" poli
USING "PurchaseOrder" po
WHERE poli."purchaseOrderId" = po."id"
  AND po."shop" = :shop!;

/* @name removeShopPurchaseOrders */
DELETE
FROM "PurchaseOrder"
WHERE "shop" = :shop!;

/* @name removeShopOldHourlyLabour */
DELETE
FROM "OldHourlyLabour" wohlc
USING "OldWorkOrder" wo
WHERE wohlc."workOrderId" = wo."id"
  AND wo."shop" = :shop!;

/* @name removeShopOldFixedPriceLabour */
DELETE
FROM "OldFixedPriceLabour" woflc
USING "OldWorkOrder" wo
WHERE woflc."workOrderId" = wo."id"
  AND wo."shop" = :shop!;

/* @name removeShopOldWorkOrders */
DELETE
FROM "OldWorkOrder" wo
WHERE wo."shop" = :shop!;
