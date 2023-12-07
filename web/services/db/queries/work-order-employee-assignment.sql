/* @name insert */
INSERT INTO "EmployeeAssignment" ("workOrderId", "employeeId")
VALUES (:workOrderId!, :employeeId!);

/* @name remove */
DELETE FROM "EmployeeAssignment"
WHERE "workOrderId" = :workOrderId!;

/* @name get */
SELECT *
FROM "EmployeeAssignment"
WHERE "workOrderId" = :workOrderId!;

