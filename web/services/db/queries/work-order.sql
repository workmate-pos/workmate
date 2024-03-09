/* @name upsert */
INSERT INTO "WorkOrder" (shop, name, status, "dueDate", "customerId", "derivedFromOrderId", note)
VALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :note!)
ON CONFLICT ("shop", "name") DO UPDATE SET status               = EXCLUDED.status,
                                           "dueDate"            = EXCLUDED."dueDate",
                                           "customerId"         = EXCLUDED."customerId",
                                           "derivedFromOrderId" = EXCLUDED."derivedFromOrderId",
                                           note                 = EXCLUDED.note
RETURNING *;

/* @name getPage */
SELECT wo.*
FROM "WorkOrder" wo
       LEFT JOIN "Customer" c ON wo."customerId" = c."customerId"
WHERE wo.shop = :shop!
  AND wo.status = COALESCE(:status, wo.status)
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
