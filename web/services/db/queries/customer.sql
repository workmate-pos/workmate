/* @name getWorkOrderCustomer */
SELECT c.*
FROM "Customer" c
INNER JOIN "WorkOrder" wo ON wo."customerId" = c.id
WHERE wo.id = :workOrderId!;

/* @name page */
SELECT *
FROM "Customer"
WHERE shop = :shop!
ORDER BY name ASC
LIMIT :limit!
OFFSET :offset;
