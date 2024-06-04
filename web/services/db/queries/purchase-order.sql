/*
  @name getPage
  @param requiredCustomFieldFilters -> ((key, value, inverse!)...)
*/
WITH "CustomFieldFilters" AS (SELECT row_number() over () as row, key, val, inverse
                              FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS "CustomFieldFilters"(key, val, inverse))
SELECT DISTINCT po.id, po.name
FROM "PurchaseOrder" po
       LEFT JOIN "PurchaseOrderLineItem" poli ON po.id = poli."purchaseOrderId"
       LEFT JOIN "ProductVariant" pv ON poli."productVariantId" = pv."productVariantId"
       LEFT JOIN "Product" p ON pv."productId" = p."productId"
       LEFT JOIN "PurchaseOrderEmployeeAssignment" poea ON po.id = poea."purchaseOrderId"
       LEFT JOIN "Employee" e ON poea."employeeId" = e."staffMemberId"
       LEFT JOIN "Location" l ON po."locationId" = l."locationId"
       LEFT JOIN "ShopifyOrderLineItem" soli ON poli."shopifyOrderLineItemId" = soli."lineItemId"
       LEFT JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
       LEFT JOIN "Customer" c ON so."customerId" = c."customerId"
       LEFT JOIN "WorkOrderItem" woi ON soli."lineItemId" = woi."shopifyOrderLineItemId"
       LEFT JOIN "WorkOrder" wo ON woi."workOrderId" = wo."id"
WHERE po.shop = :shop!
  AND po.status ILIKE COALESCE(:status, po.status)
  AND c."customerId" IS NOT DISTINCT FROM COALESCE(:customerId, c."customerId")
  AND (
  po.name ILIKE COALESCE(:query, '%')
    OR po.note ILIKE COALESCE(:query, '%')
    OR po."vendorName" ILIKE COALESCE(:query, '%')
    OR c."displayName" ILIKE COALESCE(:query, '%')
    OR l.name ILIKE COALESCE(:query, '%')
    OR so.name ILIKE COALESCE(:query, '%')
    OR po."shipTo" ILIKE COALESCE(:query, '%')
    OR po."shipFrom" ILIKE COALESCE(:query, '%')
    OR wo.name ILIKE COALESCE(:query, '%')
    OR pv.sku ILIKE COALESCE(:query, '%')
    OR pv."title" ILIKE COALESCE(:query, '%')
    OR p."title" ILIKE COALESCE(:query, '%')
    OR e.name ILIKE COALESCE(:query, '%')
  )
  AND (SELECT COUNT(row) = COUNT(NULLIF(match, FALSE))
       FROM (SELECT row, COALESCE(BOOL_OR(match), FALSE) AS match
             FROM (SELECT filter.row,
                          (filter.key IS NOT NULL) AND
                          (COALESCE(filter.val ILIKE pocf.value, pocf.value IS NOT DISTINCT FROM filter.val)) !=
                          filter.inverse
                   FROM "CustomFieldFilters" filter
                          LEFT JOIN "PurchaseOrderCustomField" pocf
                                    ON (pocf."purchaseOrderId" = po.id AND
                                        pocf.key ILIKE COALESCE(filter.key, pocf.key))) AS a(row, match)
             GROUP BY row) b(row, match))
ORDER BY po.id DESC
LIMIT :limit! OFFSET :offset;

/* @name get */
SELECT *
FROM "PurchaseOrder"
WHERE id = COALESCE(:id, id)
  AND shop = COALESCE(:shop, shop)
  AND name = COALESCE(:name, name);

/*
  @name getMany
  @param purchaseOrderIds -> (...)
*/
SELECT *
FROM "PurchaseOrder"
WHERE id IN :purchaseOrderIds!;

/* @name upsert */
INSERT INTO "PurchaseOrder" (shop, "locationId", discount, tax, shipping, deposited, paid, name, status, "shipFrom",
                             "shipTo", note, "vendorName")
VALUES (:shop!, :locationId, :discount, :tax, :shipping, :deposited, :paid, :name!, :status!, :shipFrom!, :shipTo!,
        :note!, :vendorName)
ON CONFLICT (shop, name) DO UPDATE
  SET "shipFrom"   = EXCLUDED."shipFrom",
      "shipTo"     = EXCLUDED."shipTo",
      "locationId" = EXCLUDED."locationId",
      note         = EXCLUDED.note,
      discount     = EXCLUDED.discount,
      tax          = EXCLUDED.tax,
      shipping     = EXCLUDED.shipping,
      deposited    = EXCLUDED.deposited,
      paid         = EXCLUDED.paid,
      status       = EXCLUDED.status,
      "vendorName" = EXCLUDED."vendorName"
RETURNING id;

/* @name getLineItems */
SELECT *
FROM "PurchaseOrderLineItem"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/*
  @name getLineItemsByUuids
  @param uuids -> (...)
*/
SELECT *
FROM "PurchaseOrderLineItem"
WHERE uuid IN :uuids!
  AND "purchaseOrderId" = :purchaseOrderId!;

/* @name getCustomFields */
SELECT *
FROM "PurchaseOrderCustomField"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name getCommonCustomFieldsForShop */
SELECT DISTINCT key, COUNT(*)
FROM "PurchaseOrderCustomField"
       INNER JOIN "PurchaseOrder" po ON "purchaseOrderId" = po.id
WHERE po.shop = :shop!
  AND key ILIKE COALESCE(:query, '%')
GROUP BY key
ORDER BY COUNT(*)
LIMIT :limit! OFFSET :offset!;

/* @name insertLineItemCustomField */
INSERT INTO "PurchaseOrderLineItemCustomField" ("purchaseOrderId", "purchaseOrderLineItemUuid", key, value)
VALUES (:purchaseOrderId!, :purchaseOrderLineItemUuid!, :key!, :value!);

/* @name removeLineItemCustomFields */
DELETE
FROM "PurchaseOrderLineItemCustomField"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name getLineItemCustomFields */
SELECT *
FROM "PurchaseOrderLineItemCustomField"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name getAssignedEmployees */
SELECT *
FROM "PurchaseOrderEmployeeAssignment"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name removeLineItems */
DELETE
FROM "PurchaseOrderLineItem"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name removeLineItem */
DELETE
FROM "PurchaseOrderLineItem"
WHERE uuid = :uuid!
  AND "purchaseOrderId" = :purchaseOrderId!;

/* @name removeCustomFields */
DELETE
FROM "PurchaseOrderCustomField"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name removeAssignedEmployees */
DELETE
FROM "PurchaseOrderEmployeeAssignment"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name upsertLineItem */
INSERT INTO "PurchaseOrderLineItem" (uuid, "purchaseOrderId", "productVariantId", "shopifyOrderLineItemId", quantity,
                                     "availableQuantity", "unitCost")
VALUES (:uuid!, :purchaseOrderId!, :productVariantId!, :shopifyOrderLineItemId, :quantity!, :availableQuantity!,
        :unitCost!)
ON CONFLICT ("purchaseOrderId", uuid)
  DO UPDATE
  SET "productVariantId"       = EXCLUDED."productVariantId",
      "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
      quantity                 = EXCLUDED.quantity,
      "availableQuantity"      = EXCLUDED."availableQuantity",
      "unitCost"               = EXCLUDED."unitCost";

/* @name setLineItemShopifyOrderLineItemId */
UPDATE "PurchaseOrderLineItem"
SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId
WHERE uuid = :uuid!
AND "purchaseOrderId" = :purchaseOrderId!;

/* @name insertCustomField */
INSERT INTO "PurchaseOrderCustomField" ("purchaseOrderId", key, value)
VALUES (:purchaseOrderId!, :key!, :value!);

/* @name insertAssignedEmployee */
INSERT INTO "PurchaseOrderEmployeeAssignment" ("purchaseOrderId", "employeeId")
VALUES (:purchaseOrderId!, :employeeId!);

/* @name getProductVariantCostsForShop */
SELECT "unitCost", "quantity"
FROM "PurchaseOrderLineItem"
       INNER JOIN "PurchaseOrder" po ON "purchaseOrderId" = po.id
WHERE po.shop = :shop!
  AND "productVariantId" = :productVariantId!;

/* @name getPurchaseOrderLineItemsByShopifyOrderLineItemId */
SELECT *
FROM "PurchaseOrderLineItem"
WHERE "shopifyOrderLineItemId" = :shopifyOrderLineItemId!;

/*
  @name getPurchaseOrderLineItemsByShopifyOrderLineItemIds
  @param shopifyOrderLineItemIds -> (...)
*/
SELECT *
FROM "PurchaseOrderLineItem"
WHERE "shopifyOrderLineItemId" IN :shopifyOrderLineItemIds!;

/*
  @name getLinkedPurchaseOrdersByShopifyOrderIds
  @param shopifyOrderIds -> (...)
*/
SELECT DISTINCT po.*
FROM "ShopifyOrder" so
       INNER JOIN "ShopifyOrderLineItem" soli USING ("orderId")
       INNER JOIN "PurchaseOrderLineItem" poli ON poli."shopifyOrderLineItemId" = soli."lineItemId"
       INNER JOIN "PurchaseOrder" po ON po.id = poli."purchaseOrderId"
WHERE so."orderId" in :shopifyOrderIds!;

