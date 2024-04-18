/* @name upsert */
INSERT INTO "WorkOrder" (shop, name, status, "dueDate", "customerId", "derivedFromOrderId", note, "discountAmount",
                         "discountType")
VALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :note!, :discountAmount, :discountType)
ON CONFLICT ("shop", "name") DO UPDATE SET status               = EXCLUDED.status,
                                           "dueDate"            = EXCLUDED."dueDate",
                                           "customerId"         = EXCLUDED."customerId",
                                           "derivedFromOrderId" = EXCLUDED."derivedFromOrderId",
                                           note                 = EXCLUDED.note,
                                           "discountAmount"     = EXCLUDED."discountAmount",
                                           "discountType"       = EXCLUDED."discountType"
RETURNING *;

/* @name insertCustomField */
INSERT INTO "WorkOrderCustomField" ("workOrderId", key, value)
VALUES (:workOrderId!, :key!, :value!);

/* @name removeCustomFields */
DELETE
FROM "WorkOrderCustomField"
WHERE "workOrderId" = :workOrderId!;

/* @name getCustomFields */
SELECT *
FROM "WorkOrderCustomField"
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
  woi."shopifyOrderLineItemId" = soli."lineItemId"
    OR wohlc."shopifyOrderLineItemId" = soli."lineItemId"
    OR wofplc."shopifyOrderLineItemId" = soli."lineItemId"
  )
       LEFT JOIN "ShopifyOrder" so ON (
  so."orderType" = 'ORDER' AND
  soli."orderId" = so."orderId"
  )
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
                          ((filter.key IS NOT NULL OR wocf.key IS NOT NULL)) AND
                          (COALESCE(filter.val ILIKE wocf.value, wocf.value IS NOT DISTINCT FROM filter.val)) !=
                          filter.inverse
                   FROM "CustomFieldFilters" filter
                          LEFT JOIN "WorkOrderCustomField" wocf
                                    ON (wocf."workOrderId" = wo.id AND
                                        wocf.key ILIKE COALESCE(filter.key, wocf.key))) AS a(row, match)
             GROUP BY row) b(row, match))
GROUP BY wo.id
HAVING (COUNT(DISTINCT so."orderId") >= COALESCE(:minimumOrderCount, 0)
  AND (BOOL_AND(so."fullyPaid") = :allPaid OR :allPaid IS NULL)) != COALESCE(:inverseOrderConditions, FALSE)
AND (SUM(poli."availableQuantity") IS NOT DISTINCT FROM SUM(poli."quantity")) = :purchaseOrdersFulfilled OR :purchaseOrdersFulfilled IS NULL
ORDER BY wo.id DESC
LIMIT :limit! OFFSET :offset;

/* @name get */
SELECT *
FROM "WorkOrder"
WHERE id = COALESCE(:id, id)
  AND shop = COALESCE(:shop, shop)
  AND name = COALESCE(:name, name);

/* @name getItems */
SELECT *
FROM "WorkOrderItem"
WHERE "workOrderId" = :workOrderId!;

/* @name getUnlinkedItems */
SELECT *
FROM "WorkOrderItem"
WHERE "workOrderId" = :workOrderId!
  AND "shopifyOrderLineItemId" IS NULL;

/* @name getUnlinkedHourlyLabourCharges */
SELECT *
FROM "WorkOrderHourlyLabourCharge"
WHERE "workOrderId" = :workOrderId!
  AND "shopifyOrderLineItemId" IS NULL;

/* @name getUnlinkedFixedPriceLabourCharges */
SELECT *
FROM "WorkOrderFixedPriceLabourCharge"
WHERE "workOrderId" = :workOrderId!
  AND "shopifyOrderLineItemId" IS NULL;

/*
  @name getItemsByUuids
  @param uuids -> (...)
*/
SELECT *
FROM "WorkOrderItem"
WHERE uuid in :uuids!
  AND "workOrderId" = :workOrderId!;

/* @name setLineItemShopifyOrderLineItemId */
UPDATE "WorkOrderItem"
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


/* @name removeItem */
DELETE
FROM "WorkOrderItem"
WHERE uuid = :uuid!
  AND "workOrderId" = :workOrderId!;
