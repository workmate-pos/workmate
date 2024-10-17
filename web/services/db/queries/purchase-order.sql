/*
  @name getPage
  @param requiredCustomFieldFilters -> ((key, value, inverse!)...)
*/
WITH "CustomFieldFilters" AS (SELECT row_number() over () as row, key, val, inverse
                              FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS "CustomFieldFilters"(key, val, inverse))
SELECT DISTINCT po.id, po.name
FROM "PurchaseOrder" po
       LEFT JOIN "PurchaseOrderLineItem" poli ON po.id = poli."purchaseOrderId"
       LEFT JOIN "SpecialOrderLineItem" spoli ON poli."specialOrderLineItemId" = spoli.id
       LEFT JOIN "ProductVariant" pv ON poli."productVariantId" = pv."productVariantId"
       LEFT JOIN "Product" p ON pv."productId" = p."productId"
       LEFT JOIN "PurchaseOrderEmployeeAssignment" poea ON po.id = poea."purchaseOrderId"
       LEFT JOIN "Employee" e ON poea."employeeId" = e."staffMemberId"
       LEFT JOIN "Location" l ON po."locationId" = l."locationId"
       LEFT JOIN "ShopifyOrderLineItem" soli ON spoli."shopifyOrderLineItemId" = soli."lineItemId"
       LEFT JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
       LEFT JOIN "Customer" c ON so."customerId" = c."customerId"
       LEFT JOIN "WorkOrderItem" woi ON soli."lineItemId" = woi."shopifyOrderLineItemId"
       LEFT JOIN "WorkOrder" wo ON woi."workOrderId" = wo."id"
WHERE po.shop = :shop!
  AND po.status ILIKE COALESCE(:status, po.status)
  AND c."customerId" IS NOT DISTINCT FROM COALESCE(:customerId, c."customerId")
  AND (
  po."locationId" = ANY (COALESCE(:locationIds, ARRAY [po."locationId"]))
    OR (wo."locationId" IS NULL AND :locationIds :: text[] IS NULL)
  )
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
    OR e.name ILIKE COALESCE(:query, '%')
  )
  AND (SELECT COUNT(row) = COUNT(NULLIF(match, FALSE))
       FROM (SELECT row, COALESCE(BOOL_OR(match), FALSE) AS match
             FROM (SELECT filter.row,
                          (filter.key IS NOT NULL) AND
                          (COALESCE(filter.val ILIKE pocf.value, pocf.value IS NOT DISTINCT FROM filter.val)) !=
                          filter.inverse
                   FROM "CustomFieldFilters" filter
                          LEFT JOIN "PurchaseOrderCustomField" pocf
                                    ON (pocf."purchaseOrderId" = po.id AND
                                        pocf.key ILIKE COALESCE(filter.key, pocf.key))) AS a(row, match)
             GROUP BY row) b(row, match))
ORDER BY po.id DESC
LIMIT :limit! OFFSET :offset;

/* @name getProductVariantCostsForShop */
SELECT "unitCost", "quantity"
FROM "PurchaseOrderLineItem"
       INNER JOIN "PurchaseOrder" po ON "purchaseOrderId" = po.id
WHERE po.shop = :shop!
  AND "productVariantId" = :productVariantId!;

/*
  @name getLinkedPurchaseOrdersByShopifyOrderIds
  @param shopifyOrderIds -> (...)
*/
SELECT DISTINCT po.*
FROM "ShopifyOrder" so
       INNER JOIN "ShopifyOrderLineItem" soli USING ("orderId")
       INNER JOIN "SpecialOrderLineItem" spoli ON spoli."shopifyOrderLineItemId" = soli."lineItemId"
       INNER JOIN "PurchaseOrderLineItem" poli ON poli."specialOrderLineItemId" = spoli.id
       INNER JOIN "PurchaseOrder" po ON po.id = poli."purchaseOrderId"
WHERE so."orderId" in :shopifyOrderIds!;

