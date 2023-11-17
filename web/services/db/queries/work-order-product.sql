/* @name remove */
DELETE FROM "WorkOrderProduct"
WHERE "workOrderId" = :workOrderId!;

/* @name get */
SELECT *
FROM "WorkOrderProduct"
WHERE "workOrderId" = :workOrderId!;

/* @name insert */
INSERT INTO "WorkOrderProduct" ("productVariantId", "unitPrice", quantity, "workOrderId")
VALUES (:productVariantId!, :unitPrice!, :quantity!, :workOrderId!);

