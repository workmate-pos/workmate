/* @name getMany */
SELECT ea.*
FROM "EmployeeAssignment" ea
INNER JOIN "WorkOrder" wo ON ea."workOrderId" = wo.id
WHERE wo.shop = :shop!
AND wo.name = :name!;

/*
  @name upsertMany
  @param assignments -> ((productVariantId, lineItemUuid, employeeId, rate, hours)...)
*/
INSERT INTO "EmployeeAssignment" ("productVariantId", "lineItemUuid", "employeeId", rate, hours, "workOrderId")
SELECT productVariantId, lineItemUuid, employeeId, rate, hours, (SELECT wo.id FROM "WorkOrder" wo WHERE wo.shop = :shop! AND wo.name = :name!)
FROM (VALUES ('', '', '', 0, 0), :assignments OFFSET 1) as t (productVariantId, lineItemUuid, employeeId, rate, hours);

/* @name remove */
DELETE FROM "EmployeeAssignment" ea
USING "WorkOrder" wo
WHERE wo.shop = :shop
AND wo.name = :name
AND ea."workOrderId" = wo.id;


