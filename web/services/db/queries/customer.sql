/* @name getWorkOrderCustomer */
SELECT c.*
FROM "Customer" c
         INNER JOIN "WorkOrder" wo ON wo."customerId" = c.id
WHERE wo.id = :workOrderId!;

/* @name page */
SELECT *
FROM "Customer"
WHERE shop = :shop!
AND (
  name ILIKE COALESCE(:query, '%') OR
  email ILIKE COALESCE(:query, '%') OR
  phone ILIKE COALESCE(:query, '%')
  )
ORDER BY name ASC
LIMIT :limit! OFFSET :offset;

/* @name upsert */
INSERT INTO "Customer" (id, shop, name, phone, email)
VALUES (:id!, :shop!, :name!, :phone, :email)
ON CONFLICT (id, shop) DO UPDATE
    SET name  = :name!,
        phone = :phone,
        email = :email
RETURNING *;
