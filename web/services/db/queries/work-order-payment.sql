/* @name get */
SELECT *
FROM "WorkOrderPayment"
WHERE "workOrderId" = :workOrderId!;

/* @name insert */
INSERT INTO "WorkOrderPayment" ("workOrderId", "orderId", type, amount)
VALUES (:workOrderId!, :orderId!, :type!, :amount!)
RETURNING *;

