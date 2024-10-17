/* TODO: Fix this only showing if has line items */
/* @name getPage */
SELECT *
FROM "StockTransfer"
WHERE "shop" = :shop!
  AND "fromLocationId" = COALESCE(:fromLocationId, "fromLocationId")
  AND "toLocationId" = COALESCE(:toLocationId, "toLocationId")
  AND name ILIKE COALESCE(:query, '%')
  AND "fromLocationId" = ANY (COALESCE(:locationIds, ARRAY ["fromLocationId"]))
  AND "toLocationId" = ANY (COALESCE(:locationIds, ARRAY ["toLocationId"]))
  AND EXISTS (SELECT 1
              FROM "StockTransferLineItem"
              WHERE "stockTransferId" = "StockTransfer".id
                AND "status" = COALESCE(:status, "status"))
ORDER BY "createdAt" DESC
LIMIT :limit! OFFSET :offset!;

/* @name getCount */
SELECT COUNT(*) :: INTEGER as "count"
FROM "StockTransfer"
WHERE "shop" = :shop!
  AND "fromLocationId" = COALESCE(:fromLocationId, "fromLocationId")
  AND "toLocationId" = COALESCE(:toLocationId, "toLocationId")
  AND name ILIKE COALESCE(:query, '%')
  AND "fromLocationId" = ANY (COALESCE(:locationIds, ARRAY ["fromLocationId"]))
  AND "toLocationId" = ANY (COALESCE(:locationIds, ARRAY ["toLocationId"]))
    AND EXISTS (SELECT 1
                FROM "StockTransferLineItem"
                WHERE "stockTransferId" = "StockTransfer".id
                  AND "status" = COALESCE(:status, "status"));

