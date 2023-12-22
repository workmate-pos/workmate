/* @name getNextIdForShop */
SELECT NEXTVAL(FORMAT('%I', :shopSequenceName! :: TEXT)) :: INTEGER AS "id!";

/* @name upsert */
INSERT INTO "WorkOrder" (shop, name, status, "dueDate", "customerId", "derivedFromOrderId", "orderId",
                         "draftOrderId")
VALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :orderId,
        :draftOrderId)
ON CONFLICT ("shop", "name") DO UPDATE SET status               = EXCLUDED.status,
                                           "dueDate"            = EXCLUDED."dueDate",
                                           "customerId"         = EXCLUDED."customerId",
                                           "derivedFromOrderId" = EXCLUDED."derivedFromOrderId",
                                           "orderId"            = EXCLUDED."orderId",
                                           "draftOrderId"       = EXCLUDED."draftOrderId"
RETURNING *;

/* @name updateOrderIds */
UPDATE "WorkOrder"
SET "orderId"      = COALESCE(:orderId, "orderId"),
    "draftOrderId" = COALESCE(:draftOrderId, "draftOrderId")
WHERE id = :id!;

/*
  @name getPage
*/
SELECT *
FROM "WorkOrder" wo
WHERE shop = :shop!
  AND wo.status = COALESCE(:status, wo.status)
  AND (
  wo.status ILIKE COALESCE(:query, '%') OR
  wo.name ILIKE COALESCE(:query, '%')
  )
AND (EXISTS(
  SELECT *
  FROM "EmployeeAssignment" ea
  WHERE "workOrderId" = wo.id
  AND "employeeId" = ANY(:employeeIds)
) OR :employeeIds IS NULL)
AND "customerId" = COALESCE(:customerId, "customerId")
ORDER BY wo.id DESC
LIMIT :limit!
OFFSET :offset;

/* @name get */
SELECT *
FROM "WorkOrder"
WHERE id = COALESCE(:id, id)
  AND shop = COALESCE(:shop, shop)
  AND name = COALESCE(:name, name);


/* @name getByDraftOrderIdOrOrderId */
SELECT *
FROM "WorkOrder"
WHERE "orderId" = :id!
OR "draftOrderId" = :id!;
