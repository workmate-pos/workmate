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
  woi."shopifyOrderLineItemId" = soli."lineItemId" OR
  wohlc."shopifyOrderLineItemId" = soli."lineItemId" OR
  wofplc."shopifyOrderLineItemId" = soli."lineItemId"
  )
       LEFT JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
       LEFT JOIN "PurchaseOrderLineItem" poli ON soli."lineItemId" = poli."shopifyOrderLineItemId"

       LEFT JOIN "WorkOrderDeposit" wod ON wo.id = wod."workOrderId"
       LEFT JOIN "ShopifyOrderLineItem" solid ON wod."shopifyOrderLineItemId" = solid."lineItemId"
       LEFT JOIN "ShopifyOrder" sod ON solid."orderId" = sod."orderId"
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
                          (filter.key IS NOT NULL) AND (COALESCE(filter.val ILIKE wocf.value, wocf.value IS NOT DISTINCT FROM filter.val)) !=
                          filter.inverse
                   FROM "CustomFieldFilters" filter
                          LEFT JOIN "WorkOrderCustomField" wocf
                                    ON (wocf."workOrderId" = wo.id AND
                                        wocf.key ILIKE COALESCE(filter.key, wocf.key))) AS a(row, match)
             GROUP BY row) b(row, match))
GROUP BY wo.id
HAVING (
         (((NOT COALESCE(BOOL_OR(so."fullyPaid"), FALSE) AND NOT COALESCE(BOOL_OR(sod."fullyPaid"), FALSE))) OR
          NOT :unpaid!) AND
         (((COALESCE(BOOL_OR(so."fullyPaid"), FALSE) OR COALESCE(BOOL_OR(sod."fullyPaid"), FALSE)) AND
           NOT COALESCE(BOOL_AND(so."fullyPaid"), FALSE)) OR NOT :partiallyPaid!) AND
         (COALESCE(BOOL_AND(so."fullyPaid"), FALSE) OR NOT :fullyPaid!) AND
         ((NOT COALESCE(BOOL_OR(so."fullyPaid"), FALSE) AND COALESCE(BOOL_OR(sod."fullyPaid"), FALSE)) OR
          NOT :hasPaidDeposit!)
         ) != :inverseOrderConditions!
   AND ((SUM(poli."availableQuantity") IS NOT DISTINCT FROM SUM(poli."quantity")) = :purchaseOrdersFulfilled
  OR :purchaseOrdersFulfilled IS NULL)
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

/*
  @name getItemsByUuids
  @param uuids -> (...)
*/
SELECT *
FROM "WorkOrderItem"
WHERE uuid IN :uuids!
  AND "workOrderId" = :workOrderId!;

/* @name setItemShopifyOrderLineItemId */
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


/* @name getDeposits */
SELECT *
FROM "WorkOrderDeposit"
WHERE "workOrderId" = :workOrderId!;

/*
  @name getDepositsByUuids
  @param uuids -> (...)
*/
SELECT *
FROM "WorkOrderDeposit"
WHERE uuid IN :uuids!
  AND "workOrderId" = :workOrderId!;

/* @name upsertDeposit */
INSERT INTO "WorkOrderDeposit" ("workOrderId", uuid, "shopifyOrderLineItemId", amount)
VALUES (:workOrderId!, :uuid!, :shopifyOrderLineItemId, :amount!)
ON CONFLICT ("workOrderId", uuid)
  DO UPDATE SET "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
                amount                   = EXCLUDED.amount;

/* @name removeDeposit */
DELETE
FROM "WorkOrderDeposit"
WHERE uuid = :uuid!
  AND "workOrderId" = :workOrderId!;

/* @name getPaidDeposits */
SELECT wod.*
FROM "WorkOrderDeposit" wod
       INNER JOIN "ShopifyOrderLineItem" soli ON "shopifyOrderLineItemId" = soli."lineItemId"
       INNER JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
WHERE so."fullyPaid" = TRUE
  AND wod."workOrderId" = :workOrderId!
  AND so."orderType" = 'ORDER';

/* @name getAppliedDiscounts */
SELECT DISTINCT sod.*
FROM "WorkOrder" wo
       LEFT JOIN "WorkOrderItem" woi ON wo.id = woi."workOrderId"
       LEFT JOIN "WorkOrderFixedPriceLabourCharge" wfplc ON wo.id = wfplc."workOrderId"
       LEFT JOIN "WorkOrderHourlyLabourCharge" whlc ON wo.id = whlc."workOrderId"
       LEFT JOIN "WorkOrderDeposit" wod ON wo.id = wod."workOrderId"
       INNER JOIN "ShopifyOrderLineItem" soli ON (
  woi."shopifyOrderLineItemId" = soli."lineItemId"
    OR wfplc."shopifyOrderLineItemId" = soli."lineItemId"
    OR whlc."shopifyOrderLineItemId" = soli."lineItemId"
    OR wod."shopifyOrderLineItemId" = soli."lineItemId"
  )
       INNER JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
       INNER JOIN "ShopifyOrderDiscount" sod ON sod."orderId" = so."orderId"
WHERE wo.id = :workOrderId!
  AND so."orderType" = 'ORDER';
