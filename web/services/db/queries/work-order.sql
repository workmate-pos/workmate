/* @name getNextIdForShop */
SELECT NEXTVAL(FORMAT('%I', :shopSequenceName! :: TEXT)) :: INTEGER AS "id!";

/* @name upsert */
INSERT INTO "WorkOrder" (shop, name, status, "depositAmount", "taxAmount", "discountAmount", "shippingAmount",
                         description, "dueDate", "customerId")
VALUES (:shop!, :name!, :status!, :depositAmount!, :taxAmount!, :discountAmount!, :shippingAmount!, :description!,
        :dueDate!, :customerId!)
ON CONFLICT ("shop", "name") DO UPDATE SET status           = EXCLUDED.status,
                                           "depositAmount"  = EXCLUDED."depositAmount",
                                           "taxAmount"      = EXCLUDED."taxAmount",
                                           "discountAmount" = EXCLUDED."discountAmount",
                                           "shippingAmount" = EXCLUDED."shippingAmount",
                                           description      = EXCLUDED.description,
                                           "dueDate"        = EXCLUDED."dueDate",
                                           "customerId"     = EXCLUDED."customerId"
RETURNING "id";

/* @name createTestCustomerIfNotExists */
INSERT INTO "Customer" (id, shop, name)
VALUES (:customerId!, :shop!, 'Test Customer')
ON CONFLICT DO NOTHING;

/* @name createTestEmployeeIfNotExists */
INSERT INTO "Employee" (id, shop, name)
VALUES (:employeeId!, :shop!, 'Test Employee')
ON CONFLICT DO NOTHING;

/* @name infoPage */
SELECT wo.name,
       wo.status,
       wo."depositAmount",
       wo."taxAmount",
       wo."discountAmount",
       wo."shippingAmount",
       wo."dueDate",
       COALESCE(SUM(wop.quantity * wop."unitPrice"), 0) :: INTEGER AS "productAmount!"
FROM "WorkOrder" wo
LEFT JOIN "WorkOrderProduct" wop ON wo.id = wop."workOrderId"
LEFT JOIN "Customer" c ON wo."customerId" = c.id
LEFT JOIN "EmployeeAssignment" ea ON ea."workOrderId" = wo.id
LEFT JOIN "Employee" e ON ea."employeeId" = e.id
WHERE wo.shop = :shop!
  AND wo.status = COALESCE(:status, wo.status)
  AND (
    wo.status ILIKE COALESCE(:query, '%') OR
    wo.name ILIKE COALESCE(:query, '%') OR
    wo.description ILIKE COALESCE(:query, '%') OR
    c.name ILIKE COALESCE(:query, '%') OR
    e.name ILIKE COALESCE(:query, '%')
  )
GROUP BY wo.id
ORDER BY wo.id DESC
LIMIT :limit!
OFFSET :offset;

/* @name get */
SELECT *
FROM "WorkOrder"
WHERE id = COALESCE(:id, id)
  AND shop = COALESCE(:shop, shop)
  AND name = COALESCE(:name, name);

