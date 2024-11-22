/* @name upsert */
INSERT INTO "WorkOrder" (shop, name, status, "dueDate", "customerId", "companyId", "companyLocationId",
                         "companyContactId",
                         "derivedFromOrderId", note,
                         "internalNote",
                         "discountAmount",
                         "discountType",
                         "paymentTermsTemplateId",
                         "paymentFixedDueDate", "locationId", "staffMemberId")
VALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :companyId, :companyLocationId, :companyContactId,
        :derivedFromOrderId, :note!,
        :internalNote!,
        :discountAmount,
        :discountType,
        :paymentTermsTemplateId,
        :paymentFixedDueDate, :locationId!, :staffMemberId!)
ON CONFLICT ("shop", "name") DO UPDATE SET status                   = EXCLUDED.status,
                                           "dueDate"                = EXCLUDED."dueDate",
                                           "customerId"             = EXCLUDED."customerId",
                                           "companyId"              = EXCLUDED."companyId",
                                           "companyLocationId"      = EXCLUDED."companyLocationId",
                                           "companyContactId"       = EXCLUDED."companyContactId",
                                           "derivedFromOrderId"     = EXCLUDED."derivedFromOrderId",
                                           note                     = EXCLUDED.note,
                                           "internalNote"           = EXCLUDED."internalNote",
                                           "discountAmount"         = EXCLUDED."discountAmount",
                                           "discountType"           = EXCLUDED."discountType",
                                           "paymentTermsTemplateId" = EXCLUDED."paymentTermsTemplateId",
                                           "paymentFixedDueDate"    = EXCLUDED."paymentFixedDueDate",
                                           "locationId"             = EXCLUDED."locationId",
                                           "staffMemberId"          = EXCLUDED."staffMemberId"
RETURNING *;

/* @name updateDiscount */
UPDATE "WorkOrder"
SET "discountAmount" = :discountAmount,
    "discountType"   = :discountType
WHERE id = :id!;

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
       LEFT JOIN "WorkOrderCharge" woc ON wo.id = woc."workOrderId"

       LEFT JOIN "ShopifyOrderLineItem" soli ON (
  woi."shopifyOrderLineItemId" = soli."lineItemId" OR
  woc."shopifyOrderLineItemId" = soli."lineItemId"
  )
       LEFT JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
       LEFT JOIN "SpecialOrderLineItem" spoli on soli."lineItemId" = spoli."shopifyOrderLineItemId"
       LEFT JOIN "PurchaseOrderLineItem" poli ON poli."specialOrderLineItemId" = spoli.id
WHERE wo.shop = :shop!
  AND wo.status = COALESCE(:status, wo.status)
  AND wo."dueDate" >= COALESCE(:afterDueDate, wo."dueDate")
  AND wo."dueDate" <= COALESCE(:beforeDueDate, wo."dueDate")
  AND (
  wo."locationId" = ANY (COALESCE(:locationIds, ARRAY [wo."locationId"]))
    OR (wo."locationId" IS NULL AND :locationIds :: text[] IS NULL)
  )
  AND (
  wo.status ILIKE COALESCE(:query, '%')
    OR wo.name ILIKE COALESCE(:query, '%')
    OR c."displayName" ILIKE COALESCE(:query, '%')
    OR c.phone ILIKE COALESCE(:query, '%')
    OR c.email ILIKE COALESCE(:query, '%')
  )
  AND (EXISTS(SELECT *
              FROM "WorkOrderCharge" c
              WHERE c."workOrderId" = wo.id
                AND c.data ->> 'employeeId' = ANY (:employeeIds)) OR :employeeIds IS NULL)
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
   AND ((SUM((SELECT r.quantity
              FROM "PurchaseOrderReceiptLineItem" r
              WHERE r."purchaseOrderId" = poli."purchaseOrderId"
                AND r."lineItemUuid" = poli.uuid)) IS NOT DISTINCT FROM SUM(poli."quantity")) = :purchaseOrdersFulfilled
  OR :purchaseOrdersFulfilled IS NULL)
ORDER BY wo.id DESC
LIMIT :limit! OFFSET :offset;

/* @name getById */
SELECT *
FROM "WorkOrder"
WHERE id = :id!;

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

/* @name removeItem */
DELETE
FROM "WorkOrderItem"
WHERE uuid = :uuid!
  AND "workOrderId" = :workOrderId!;

/* @name getAppliedDiscounts */
SELECT DISTINCT sod.*
FROM "WorkOrder" wo
       LEFT JOIN "WorkOrderItem" woi ON wo.id = woi."workOrderId"
       LEFT JOIN "WorkOrderCharge" woc ON wo.id = woc."workOrderId"
       INNER JOIN "ShopifyOrderLineItem" soli ON (
  woi."shopifyOrderLineItemId" = soli."lineItemId"
    OR woc."shopifyOrderLineItemId" = soli."lineItemId"
  )
       INNER JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
       INNER JOIN "ShopifyOrderDiscount" sod ON sod."orderId" = so."orderId"
WHERE wo.id = :workOrderId!
  AND so."orderType" = 'ORDER';
