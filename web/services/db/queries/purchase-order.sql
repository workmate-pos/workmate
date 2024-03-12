/* @name getPage */
SELECT DISTINCT po.id, po.name
FROM "PurchaseOrder" po
       LEFT JOIN "PurchaseOrderLineItem" poli ON po.id = poli."purchaseOrderId"
       LEFT JOIN "ProductVariant" pv ON poli."productVariantId" = pv."productVariantId"
       LEFT JOIN "Product" p ON pv."productId" = p."productId"
       LEFT JOIN "PurchaseOrderCustomField" pocf ON po.id = pocf."purchaseOrderId"
       LEFT JOIN "PurchaseOrderEmployeeAssignment" poea ON po.id = poea."purchaseOrderId"
       LEFT JOIN "Employee" e ON poea."employeeId" = e."staffMemberId"
       LEFT JOIN "Location" l ON po."locationId" = l."locationId"
       LEFT JOIN "ShopifyOrderLineItem" soli ON poli."shopifyOrderLineItemId" = soli."lineItemId"
       LEFT JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
       LEFT JOIN "Customer" c ON so."customerId" = c."customerId"
       LEFT JOIN "WorkOrderItem" woi ON soli."lineItemId" = woi."shopifyOrderLineItemId"
       LEFT JOIN "WorkOrder" wo ON woi."workOrderId" = wo."id"
WHERE po.shop = :shop!
  AND po.status = COALESCE(:status, po.status)
  AND c."customerId" IS NOT DISTINCT FROM COALESCE(:customerId, c."customerId")
  AND (
  po.name ILIKE COALESCE(:query, '%')
    OR po.note ILIKE COALESCE(:query, '%')
    OR po."vendorName" ILIKE COALESCE(:query, '%')
    OR c."displayName" ILIKE COALESCE(:query, '%')
    OR l.name ILIKE COALESCE(:query, '%')
    OR so.name ILIKE COALESCE(:query, '%')
    OR po."shipTo" ILIKE COALESCE(:query, '%')
    OR po."shipFrom" ILIKE COALESCE(:query, '%')
    OR wo.name ILIKE COALESCE(:query, '%')
    OR pv.sku ILIKE COALESCE(:query, '%')
    OR pv."title" ILIKE COALESCE(:query, '%')
    OR p."title" ILIKE COALESCE(:query, '%')
    OR pocf.value ILIKE COALESCE(:query, '%')
    OR e.name ILIKE COALESCE(:query, '%')
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
INSERT INTO "PurchaseOrder" (shop, "locationId", discount, tax, shipping, deposited, paid, name, status, "shipFrom",
                             "shipTo", note, "vendorName")
VALUES (:shop!, :locationId, :discount, :tax, :shipping, :deposited, :paid, :name!, :status!, :shipFrom!, :shipTo!,
        :note!, :vendorName)
ON CONFLICT (shop, name) DO UPDATE
  SET "shipFrom"   = :shipFrom,
      "shipTo"     = :shipTo,
      "locationId" = :locationId,
      note         = :note,
      discount     = :discount,
      tax          = :tax,
      shipping     = :shipping,
      deposited    = :deposited,
      paid         = :paid,
      status       = :status!,
      "vendorName" = :vendorName
RETURNING id;

/* @name getLineItems */
SELECT *
FROM "PurchaseOrderLineItem"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name getCustomFields */
SELECT *
FROM "PurchaseOrderCustomField"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name getAssignedEmployees */
SELECT *
FROM "PurchaseOrderEmployeeAssignment"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name removeLineItems */
DELETE
FROM "PurchaseOrderLineItem"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name removeCustomFields */
DELETE
FROM "PurchaseOrderCustomField"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name removeAssignedEmployees */
DELETE
FROM "PurchaseOrderEmployeeAssignment"
WHERE "purchaseOrderId" = :purchaseOrderId!;

/* @name insertLineItem */
INSERT INTO "PurchaseOrderLineItem" ("purchaseOrderId", "productVariantId", "shopifyOrderLineItemId", quantity,
                                     "availableQuantity", "unitCost")
VALUES (:purchaseOrderId!, :productVariantId!, :shopifyOrderLineItemId, :quantity!, :availableQuantity!,
        :unitCost!);

/* @name updateLineItem */
UPDATE "PurchaseOrderLineItem"
SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId
WHERE id = :id!;

/* @name insertCustomField */
INSERT INTO "PurchaseOrderCustomField" ("purchaseOrderId", key, value)
VALUES (:purchaseOrderId!, :key!, :value!);

/* @name insertAssignedEmployee */
INSERT INTO "PurchaseOrderEmployeeAssignment" ("purchaseOrderId", "employeeId")
VALUES (:purchaseOrderId!, :employeeId!);

/* @name getProductVariantCostsForShop */
SELECT "unitCost", "quantity"
FROM "PurchaseOrderLineItem"
       INNER JOIN "PurchaseOrder" po ON "purchaseOrderId" = po.id
WHERE po.shop = :shop!
  AND "productVariantId" = :productVariantId!;

/* @name getPurchaseOrderLineItemsByShopifyOrderLineItemId */
SELECT *
FROM "PurchaseOrderLineItem"
WHERE "shopifyOrderLineItemId" = :shopifyOrderLineItemId!;
