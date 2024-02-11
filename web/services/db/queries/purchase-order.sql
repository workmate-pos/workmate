/* @name getPage */
SELECT DISTINCT po.*
FROM "PurchaseOrder" po
LEFT JOIN "PurchaseOrderProduct" pop ON po.id = pop."purchaseOrderId"
LEFT JOIN "PurchaseOrderCustomField" pocf ON po.id = pocf."purchaseOrderId"
LEFT JOIN "WorkOrder" wo ON po."workOrderId" = wo.id
WHERE po.shop = :shop!
AND po.status = COALESCE(:status, po.status)
AND po."customerId" = COALESCE(:customerId, po."customerId")
AND (
  po.name ILIKE COALESCE(:query, '%')
  OR po.note ILIKE COALESCE(:query, '%')
  OR po."vendorName" ILIKE COALESCE(:query, '%')
  OR po."customerName" ILIKE COALESCE(:query, '%')
  OR po."locationName" ILIKE COALESCE(:query, '%')
  OR po."salesOrderId" ILIKE COALESCE(:query, '%')
  OR po."shipTo" ILIKE COALESCE(:query, '%')
  OR po."shipFrom" ILIKE COALESCE(:query, '%')
  OR pop.name ILIKE COALESCE(:query, '%')
  OR pop.sku ILIKE COALESCE(:query, '%')
  OR pop.handle ILIKE COALESCE(:query, '%')
  OR pocf.value ILIKE COALESCE(:query, '%')
  OR wo.name ILIKE COALESCE(:query, '%')
  )
ORDER BY po.id DESC
LIMIT :limit!
OFFSET :offset;
