/* @name getNextIdForShop */
SELECT NEXTVAL(FORMAT('%I', :shopSequenceName! :: TEXT)) :: INTEGER AS "id!";

/* @name upsert */
INSERT INTO "WorkOrder" (shop, name, status, "taxAmount", "discountAmount", "shippingAmount",
                         description, "dueDate", "customerId", "derivedFromOrderId")
VALUES (:shop!, :name!, :status!, :taxAmount!, :discountAmount!, :shippingAmount!, :description!,
        :dueDate!, :customerId!, :derivedFromOrderId)
ON CONFLICT ("shop", "name") DO UPDATE SET status           = EXCLUDED.status,
                                           "taxAmount"      = EXCLUDED."taxAmount",
                                           "discountAmount" = EXCLUDED."discountAmount",
                                           "shippingAmount" = EXCLUDED."shippingAmount",
                                           description      = EXCLUDED.description,
                                           "dueDate"        = EXCLUDED."dueDate",
                                           "customerId"     = EXCLUDED."customerId",
                                           "derivedFromOrderId" = EXCLUDED."derivedFromOrderId"
RETURNING *;

/* @name infoPage */
WITH wo AS (SELECT id, name, status, "taxAmount", "discountAmount", "shippingAmount", "dueDate"
            FROM "WorkOrder" wo
            WHERE shop = :shop!
              AND wo.status = COALESCE(:status, wo.status)
              AND (
                        wo.status ILIKE COALESCE(:query, '%') OR
                        wo.name ILIKE COALESCE(:query, '%') OR
                        wo.description ILIKE COALESCE(:query, '%'))
            ORDER BY wo.id DESC
            LIMIT :limit! OFFSET :offset),
     prod AS (SELECT "workOrderId", COALESCE(SUM(quantity * "unitPrice"), 0) :: INTEGER AS "productAmount!"
              FROM "WorkOrderProduct"
              GROUP BY "workOrderId"),
     wosea AS (SELECT wos."workOrderId", COALESCE(SUM(wosea.hours * wosea."employeeRate"), 0) :: INTEGER AS "serviceEmployeeAmount!"
              FROM "WorkOrderService" wos
              INNER JOIN "WorkOrderServiceEmployeeAssignment" wosea ON wosea."workOrderServiceId" = wos.id
              GROUP BY wos."workOrderId"),
    wos AS (SELECT "workOrderId", COALESCE(SUM("basePrice"), 0) :: INTEGER AS "serviceBaseAmount!"
            FROM "WorkOrderService"
            GROUP BY "workOrderId"),
     pay AS (SELECT "workOrderId",
                    COALESCE(SUM(amount), 0) :: INTEGER        AS "paidAmount!",
                    COALESCE(BOOL_OR(type = 'DEPOSIT'), FALSE) AS "hasDeposit!"
             FROM "WorkOrderPayment"
             GROUP BY "workOrderId")
SELECT wo.name,
       wo.status,
       wo."taxAmount",
       wo."discountAmount",
       wo."shippingAmount",
       wo."dueDate",
       prod."productAmount!",
       pay."paidAmount!",
       pay."hasDeposit!",
       (wos."serviceBaseAmount!" + wosea."serviceEmployeeAmount!") AS "serviceAmount!"
FROM wo
LEFT JOIN prod ON wo.id = prod."workOrderId"
LEFT JOIN pay ON wo.id = pay."workOrderId"
LEFT JOIN wosea ON wo.id = wosea."workOrderId"
LEFT JOIN wos ON wo.id = wos."workOrderId"
ORDER BY wo.id DESC;

/* @name get */
SELECT *
FROM "WorkOrder"
WHERE id = COALESCE(:id, id)
  AND shop = COALESCE(:shop, shop)
  AND name = COALESCE(:name, name);
