/* @name deleteWorkOrderEmployeeAssignments */
DELETE FROM "EmployeeAssignment" ea
WHERE ea."workOrderId" = :workOrderId!;

/* @name createEmployeeAssignment */
INSERT INTO "EmployeeAssignment" ("employeeId", "workOrderId")
VALUES (:employeeId!, :workOrderId!)
RETURNING *;

/* @name getAssignedEmployees */
SELECT e.*
FROM "Employee" e
INNER JOIN "EmployeeAssignment" ea ON ea."employeeId" = e."id"
WHERE ea."workOrderId" = :workOrderId!;
