/* @name upsert */
INSERT INTO "WorkOrder" (shop, name, status, "dueDate", "customerId", "derivedFromOrderId", note, "internalNote",
                         "discountAmount",
                         "discountType")
VALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :note!, :internalNote!, :discountAmount,
        :discountType)
ON CONFLICT ("shop", "name") DO UPDATE SET status               = EXCLUDED.status,
                                           "dueDate"            = EXCLUDED."dueDate",
                                           "customerId"         = EXCLUDED."customerId",
                                           "derivedFromOrderId" = EXCLUDED."derivedFromOrderId",
                                           note                 = EXCLUDED.note,
                                           "internalNote"       = EXCLUDED."internalNote",
                                           "discountAmount"     = EXCLUDED."discountAmount",
                                           "discountType"       = EXCLUDED."discountType"
RETURNING *;

/* @name updateDiscount */
UPDATE "WorkOrder"
  SET "discountAmount" = :discountAmount,
      "discountType"   = :discountType
WHERE id = :id!;

/*
  @name insertCustomFields
  @param customFields -> ((workOrderId!, key!, value!)...)
*/
INSERT INTO "WorkOrderCustomField" ("workOrderId", key, value)
VALUES (0, '', ''), :customFields OFFSET 1;

/* @name removeCustomFields */
DELETE
FROM "WorkOrderCustomField"
WHERE "workOrderId" = :workOrderId!;

/* @name getCustomFields */
SELECT *
FROM "WorkOrderCustomField"
WHERE "workOrderId" = :workOrderId!;

/*
  @name insertItemCustomFields
  @param customFields -> ((workOrderId!, workOrderItemUuid!, key!, value!)...)
*/
INSERT INTO "WorkOrderItemCustomField" ("workOrderId", "workOrderItemUuid", key, value)
VALUES (0, gen_random_uuid(), '', ''), :customFields OFFSET 1;

/* @name removeItemCustomFields */
DELETE
FROM "WorkOrderItemCustomField"
WHERE "workOrderId" = :workOrderId!;

/* @name getItemCustomFields */
SELECT *
FROM "WorkOrderItemCustomField"
WHERE "workOrderId" = :workOrderId!;

/* @name getCustomItemCustomFields */
SELECT *
FROM "WorkOrderCustomItemCustomField"
WHERE "workOrderId" = :workOrderId!;

/*
  @name getPage
  @param requiredCustomFieldFilters -> ((key, value, inverse!)...)
*/
WITH "CustomFieldFilters" AS (SELECT row_number() over () as row, key, val, inverse
                              FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS "CustomFieldFilters"(key, val, inverse))
SELECT wo.name
FROM "WorkOrder" wo
       LEFT JOIN "Customer" c ON wo."customerId" = c."customerId"

       LEFT JOIN "WorkOrderItem" woi ON wo.id = woi."workOrderId"
       LEFT JOIN "WorkOrderHourlyLabourCharge" wohlc ON wo.id = wohlc."workOrderId"
       LEFT JOIN "WorkOrderFixedPriceLabourCharge" wofplc ON wo.id = wofplc."workOrderId"

       LEFT JOIN "ShopifyOrderLineItem" soli ON (
  woi."shopifyOrderLineItemId" = soli."lineItemId" OR
  wohlc."shopifyOrderLineItemId" = soli."lineItemId" OR
  wofplc."shopifyOrderLineItemId" = soli."lineItemId"
  )
       LEFT JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
       LEFT JOIN "PurchaseOrderLineItem" poli ON soli."lineItemId" = poli."shopifyOrderLineItemId"
WHERE wo.shop = :shop!
  AND wo.status = COALESCE(:status, wo.status)
  AND wo."dueDate" >= COALESCE(:afterDueDate, wo."dueDate")
  AND wo."dueDate" <= COALESCE(:beforeDueDate, wo."dueDate")
  AND (
  wo.status ILIKE COALESCE(:query, '%')
    OR wo.name ILIKE COALESCE(:query, '%')
    OR c."displayName" ILIKE COALESCE(:query, '%')
    OR c.phone ILIKE COALESCE(:query, '%')
    OR c.email ILIKE COALESCE(:query, '%')
  )
  AND (EXISTS(SELECT *
              FROM "WorkOrderHourlyLabourCharge" hl
              WHERE hl."workOrderId" = wo.id
                AND "employeeId" = ANY (:employeeIds)) OR :employeeIds IS NULL)
  AND (EXISTS(SELECT *
              FROM "WorkOrderFixedPriceLabourCharge" fpl
              WHERE fpl."workOrderId" = wo.id
                AND "employeeId" = ANY (:employeeIds)) OR :employeeIds IS NULL)
  AND wo."customerId" = COALESCE(:customerId, wo."customerId")
  AND (SELECT COUNT(row) = COUNT(NULLIF(match, FALSE))
       FROM (SELECT row, COALESCE(BOOL_OR(match), FALSE) AS match
             FROM (SELECT filter.row,
                          (filter.key IS NOT NULL) AND
                          (COALESCE(filter.val ILIKE wocf.value, wocf.value IS NOT DISTINCT FROM filter.val)) !=
                          filter.inverse
                   FROM "CustomFieldFilters" filter
                          LEFT JOIN "WorkOrderCustomField" wocf
                                    ON (wocf."workOrderId" = wo.id AND
                                        wocf.key ILIKE COALESCE(filter.key, wocf.key))) AS a(row, match)
             GROUP BY row) b(row, match))
GROUP BY wo.id
HAVING (
         (NOT COALESCE(BOOL_OR(so."fullyPaid"), FALSE) OR NOT :unpaid!) AND
         ((COALESCE(BOOL_OR(so."fullyPaid"), FALSE) AND NOT COALESCE(BOOL_AND(so."fullyPaid"), FALSE)) OR
          NOT :partiallyPaid!) AND
         (COALESCE(BOOL_AND(so."fullyPaid"), FALSE) OR NOT :fullyPaid!)
         ) != :inverseOrderConditions!
   AND ((SUM(poli."availableQuantity") IS NOT DISTINCT FROM SUM(poli."quantity")) = :purchaseOrdersFulfilled
  OR :purchaseOrdersFulfilled IS NULL)
ORDER BY wo.id DESC
LIMIT :limit! OFFSET :offset;

/* @name get */
SELECT *
FROM "WorkOrder"
WHERE shop = :shop!
  AND name = :name!;

/* @name getById */
SELECT *
FROM "WorkOrder"
WHERE id = :id!;

/* @name getItems */
SELECT *
FROM "WorkOrderItem"
WHERE "workOrderId" = :workOrderId!;

/* @name getCustomItems */
SELECT *
FROM "WorkOrderCustomItem"
WHERE "workOrderId" = :workOrderId!;

/*
  @name getItemsByUuids
  @param uuids -> (...)
*/
SELECT *
FROM "WorkOrderItem"
WHERE uuid IN :uuids!
  AND "workOrderId" = :workOrderId!;

/*
  @name getCustomItemsByUuids
  @param uuids -> (...)
*/
SELECT *
FROM "WorkOrderCustomItem"
WHERE uuid IN :uuids!
  AND "workOrderId" = :workOrderId!;

/* @name setItemShopifyOrderLineItemId */
UPDATE "WorkOrderItem"
SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
WHERE uuid = :uuid!
  AND "workOrderId" = :workOrderId!;

/* @name setCustomItemShopifyOrderLineItemId */
UPDATE "WorkOrderCustomItem"
SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
WHERE uuid = :uuid!
  AND "workOrderId" = :workOrderId!;

/* @name upsertItem */
INSERT INTO "WorkOrderItem" (uuid, "workOrderId", "shopifyOrderLineItemId", quantity, "productVariantId",
                             "absorbCharges")
VALUES (:uuid!, :workOrderId!, :shopifyOrderLineItemId, :quantity!, :productVariantId!, :absorbCharges!)
ON CONFLICT ("workOrderId", uuid)
  DO UPDATE SET "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
                quantity                 = EXCLUDED.quantity,
                "productVariantId"       = EXCLUDED."productVariantId",
                "absorbCharges"          = EXCLUDED."absorbCharges";

/*
  @name upsertItems
  @param items -> ((uuid!, workOrderId!, shopifyOrderLineItemId, quantity!, productVariantId!, absorbCharges!)...)
*/
INSERT INTO "WorkOrderItem" (uuid, "workOrderId", "shopifyOrderLineItemId", quantity, "productVariantId",
                             "absorbCharges")
VALUES (gen_random_uuid(), 0, NULL, 0, '', FALSE), :items
OFFSET 1
ON CONFLICT ("workOrderId", uuid)
DO UPDATE SET "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
quantity = EXCLUDED.quantity,
"productVariantId" = EXCLUDED."productVariantId",
"absorbCharges" = EXCLUDED."absorbCharges";

/*
  @name upsertCustomItems
  @param items -> ((uuid!, workOrderId!, shopifyOrderLineItemId, quantity!, name!, unitPrice!, absorbCharges!)...)
*/
INSERT INTO "WorkOrderCustomItem" (uuid, "workOrderId", "shopifyOrderLineItemId", quantity, name, "unitPrice", "absorbCharges")
VALUES (gen_random_uuid(), 0, NULL, 0, '', '', FALSE), :items
OFFSET 1
ON CONFLICT ("workOrderId", uuid)
DO UPDATE SET "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
quantity = EXCLUDED.quantity,
name = EXCLUDED.name,
"unitPrice" = EXCLUDED."unitPrice",
"absorbCharges" = EXCLUDED."absorbCharges";


/* @name removeItem */
DELETE
FROM "WorkOrderItem"
WHERE uuid = :uuid!
  AND "workOrderId" = :workOrderId!;


/* @name getAppliedDiscounts */
SELECT DISTINCT sod.*
FROM "WorkOrder" wo
       LEFT JOIN "WorkOrderItem" woi ON wo.id = woi."workOrderId"
       LEFT JOIN "WorkOrderFixedPriceLabourCharge" wfplc ON wo.id = wfplc."workOrderId"
       LEFT JOIN "WorkOrderHourlyLabourCharge" whlc ON wo.id = whlc."workOrderId"
       INNER JOIN "ShopifyOrderLineItem" soli ON (
  woi."shopifyOrderLineItemId" = soli."lineItemId"
    OR wfplc."shopifyOrderLineItemId" = soli."lineItemId"
    OR whlc."shopifyOrderLineItemId" = soli."lineItemId"
  )
       INNER JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
       INNER JOIN "ShopifyOrderDiscount" sod ON sod."orderId" = so."orderId"
WHERE wo.id = :workOrderId!
  AND so."orderType" = 'ORDER';
