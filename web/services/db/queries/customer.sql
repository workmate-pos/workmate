/* @name getWorkOrderCustomer */
SELECT c.*
FROM "Customer" c
INNER JOIN "WorkOrder" wo ON wo."customerId" = c.id
WHERE wo.id = :workOrderId!;
