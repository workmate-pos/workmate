/* @name removeByWorkOrder */
DELETE FROM "WorkOrderServiceEmployeeAssignment" wosea
USING "WorkOrderService" wos
WHERE "workOrderId" = :workOrderId!
AND wos.id = wosea."workOrderServiceId";

/* @name insert */
INSERT INTO "WorkOrderServiceEmployeeAssignment" ("employeeId", "employeeRate", hours, "workOrderServiceId")
VALUES (:employeeId!, :employeeRate!, :hours!, :workOrderServiceId!);

/* @name get */
SELECT *
FROM "WorkOrderServiceEmployeeAssignment"
WHERE "workOrderServiceId" = :workOrderServiceId!;
