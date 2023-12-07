/* @name remove */
DELETE FROM "WorkOrderService"
WHERE "workOrderId" = :workOrderId!;

/* @name insert */
INSERT INTO "WorkOrderService" ("productVariantId", "basePrice", "workOrderId")
VALUES (:productVariantId!, :basePrice!, :workOrderId!)
RETURNING *;

/* @name get */
SELECT *
FROM "WorkOrderService"
WHERE "workOrderId" = :workOrderId!;
