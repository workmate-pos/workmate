/* @name getPage */
SELECT DISTINCT po.id, po.name
FROM "PurchaseOrder" po
       LEFT JOIN "PurchaseOrderProduct" pop ON po.id = pop."purchaseOrderId"
       LEFT JOIN "PurchaseOrderCustomField" pocf ON po.id = pocf."purchaseOrderId"
WHERE po.shop = :shop!
  AND po.status = COALESCE(:status, po.status)
  AND po."customerId" IS NOT DISTINCT FROM COALESCE(:customerId, po."customerId")
  AND (
  po.name ILIKE COALESCE(:query, '%')
    OR po.note ILIKE COALESCE(:query, '%')
    OR po."vendorName" ILIKE COALESCE(:query, '%')
    OR po."customerName" ILIKE COALESCE(:query, '%')
    OR po."locationName" ILIKE COALESCE(:query, '%')
    OR po."salesOrderId" ILIKE COALESCE(:query, '%')
    OR po."shipTo" ILIKE COALESCE(:query, '%')
    OR po."shipFrom" ILIKE COALESCE(:query, '%')
    OR po."workOrderName" ILIKE COALESCE(:query, '%')
    OR pop.name ILIKE COALESCE(:query, '%')
    OR pop.sku ILIKE COALESCE(:query, '%')
    OR pop.handle ILIKE COALESCE(:query, '%')
    OR pocf.value ILIKE COALESCE(:query, '%')
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
INSERT INTO "PurchaseOrder" (shop, name, status, "salesOrderId", "workOrderName", "locationId", "customerId",
                             "vendorCustomerId", note, "vendorName", "customerName", "locationName", "shipFrom",
                             "shipTo")
VALUES (:shop!, :name!, :status!, :salesOrderId, :workOrderName, :locationId, :customerId, :vendorCustomerId, :note,
        :vendorName, :customerName, :locationName, :shipFrom, :shipTo)
ON CONFLICT (shop, name) DO UPDATE
  SET status             = :status!,
      "salesOrderId"     = :salesOrderId,
      "workOrderName"    = :workOrderName,
      "locationId"       = :locationId,
      "customerId"       = :customerId,
      "vendorCustomerId" = :vendorCustomerId,
      note               = :note,
      "vendorName"       = :vendorName,
      "customerName"     = :customerName,
      "locationName"     = :locationName,
      "shipFrom"         = :shipFrom,
      "shipTo"           = :shipTo
RETURNING id;

/* @name getProducts */
SELECT *
FROM "PurchaseOrderProduct"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name getCustomFields */
SELECT *
FROM "PurchaseOrderCustomField"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name removeProducts */
DELETE
FROM "PurchaseOrderProduct"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name removeCustomFields */
DELETE
FROM "PurchaseOrderCustomField"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name insertProduct */
INSERT INTO "PurchaseOrderProduct" ("purchaseOrderId", "productVariantId", quantity, sku, name, handle)
VALUES (:purchaseOrderId!, :productVariantId!, :quantity!, :sku, :name, :handle);

/* @name insertCustomField */
INSERT INTO "PurchaseOrderCustomField" ("purchaseOrderId", key, value)
VALUES (:purchaseOrderId!, :key!, :value!);
