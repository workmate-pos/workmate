/* @name getPage */
SELECT DISTINCT po.id, po.name
FROM "PurchaseOrder" po
       LEFT JOIN "PurchaseOrderProduct" pop ON po.id = pop."purchaseOrderId"
       LEFT JOIN "PurchaseOrderCustomField" pocf ON po.id = pocf."purchaseOrderId"
       LEFT JOIN "PurchaseOrderEmployeeAssignment" poea ON po.id = poea."purchaseOrderId"
WHERE po.shop = :shop!
  AND po.status = COALESCE(:status, po.status)
  AND po."customerId" IS NOT DISTINCT FROM COALESCE(:customerId, po."customerId")
  AND (
  po.name ILIKE COALESCE(:query, '%')
    OR po.note ILIKE COALESCE(:query, '%')
    OR po."vendorName" ILIKE COALESCE(:query, '%')
    OR po."customerName" ILIKE COALESCE(:query, '%')
    OR po."locationName" ILIKE COALESCE(:query, '%')
    OR po."orderName" ILIKE COALESCE(:query, '%')
    OR po."shipTo" ILIKE COALESCE(:query, '%')
    OR po."shipFrom" ILIKE COALESCE(:query, '%')
    OR po."workOrderName" ILIKE COALESCE(:query, '%')
    OR pop.name ILIKE COALESCE(:query, '%')
    OR pop.sku ILIKE COALESCE(:query, '%')
    OR pop.handle ILIKE COALESCE(:query, '%')
    OR pocf.value ILIKE COALESCE(:query, '%')
    OR poea."employeeName" ILIKE COALESCE(:query, '%')
  )
ORDER BY po.id DESC
LIMIT :limit! OFFSET :offset;

/* @name get */
SELECT *
FROM "PurchaseOrder"
WHERE id = COALESCE(:id, id)
  AND shop = COALESCE(:shop, shop)
  AND name = COALESCE(:name, name);

/* @name upsert */
INSERT INTO "PurchaseOrder" (shop, name, status, "locationId", "customerId", "vendorCustomerId", note, "vendorName",
                             "customerName", "locationName", "shipFrom", "shipTo", "workOrderName", "orderId",
                             "orderName", "subtotal", "discount", "tax", "shipping", "deposited", "paid")
VALUES (:shop!, :name!, :status!, :locationId, :customerId, :vendorCustomerId, :note, :vendorName, :customerName,
        :locationName, :shipFrom, :shipTo, :workOrderName, :orderId, :orderName, :subtotal, :discount, :tax, :shipping,
        :deposited, :paid)
ON CONFLICT (shop, name) DO UPDATE
  SET status            = :status!,
      "locationId"      = :locationId,
      "customerId"      = :customerId,
      "vendorCustomerId"= :vendorCustomerId,
      note              = :note,
      "vendorName"      = :vendorName,
      "customerName"    = :customerName,
      "locationName"    = :locationName,
      "shipFrom"        = :shipFrom,
      "shipTo"          = :shipTo,
      "workOrderName"   = :workOrderName,
      "orderId"         = :orderId,
      "orderName"       = :orderName,
      subtotal          = :subtotal,
      discount          = :discount,
      tax               = :tax,
      shipping          = :shipping,
      deposited         = :deposited,
      paid              = :paid
RETURNING id;

/* @name getProducts */
SELECT *
FROM "PurchaseOrderProduct"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name getCustomFields */
SELECT *
FROM "PurchaseOrderCustomField"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name getAssignedEmployees */
SELECT *
FROM "PurchaseOrderEmployeeAssignment"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name removeProducts */
DELETE
FROM "PurchaseOrderProduct"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name removeCustomFields */
DELETE
FROM "PurchaseOrderCustomField"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name removeAssignedEmployees */
DELETE
FROM "PurchaseOrderEmployeeAssignment"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name insertProduct */
INSERT INTO "PurchaseOrderProduct" ("purchaseOrderId", "productVariantId", quantity, sku, name, handle)
VALUES (:purchaseOrderId!, :productVariantId!, :quantity!, :sku, :name, :handle);

/* @name insertCustomField */
INSERT INTO "PurchaseOrderCustomField" ("purchaseOrderId", key, value)
VALUES (:purchaseOrderId!, :key!, :value!);

/* @name insertAssignedEmployee */
INSERT INTO "PurchaseOrderEmployeeAssignment" ("purchaseOrderId", "employeeId", "employeeName")
VALUES (:purchaseOrderId!, :employeeId!, :employeeName);
