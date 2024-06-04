/* @name get */
SELECT *
FROM "StockTransfer"
WHERE "shop" = :shop!
  AND "name" = :name!;

/* @name upsert */
INSERT INTO "StockTransfer" (shop, name, "fromLocationId", "toLocationId", note)
VALUES (:shop!, :name!, :fromLocationId!, :toLocationId!, :note!)
ON CONFLICT ("shop", "name")
  DO UPDATE
  SET "fromLocationId" = EXCLUDED."fromLocationId",
      "toLocationId"   = EXCLUDED."toLocationId",
      note             = EXCLUDED.note
RETURNING *;

/* @name getPage */
SELECT *
FROM "StockTransfer"
WHERE "shop" = :shop!
  AND "fromLocationId" = COALESCE(:fromLocationId, "fromLocationId")
  AND "toLocationId" = COALESCE(:toLocationId, "toLocationId")
  AND name ILIKE COALESCE(:query, '%')
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
  AND EXISTS (SELECT 1
              FROM "StockTransferLineItem"
              WHERE "stockTransferId" = "StockTransfer".id
                AND "status" = COALESCE(:status, "status"));

/*
  @name upsertLineItems
  @param lineItems -> ((uuid!, stockTransferId!, inventoryItemId!, productTitle!, productVariantTitle!, status!, quantity!)...)
*/
INSERT INTO "StockTransferLineItem" (uuid, "stockTransferId", "inventoryItemId", "productTitle", "productVariantTitle",
                                     status, quantity)
VALUES (gen_random_uuid(), 0, '', '', '', 'PENDING' :: "StockTransferLineItemStatus", 0), :lineItems
OFFSET 1
ON CONFLICT ("stockTransferId", uuid)
DO UPDATE
SET "inventoryItemId" = EXCLUDED."inventoryItemId",
      "productTitle"   = EXCLUDED."productTitle",
      "productVariantTitle" = EXCLUDED."productVariantTitle",
      status            = EXCLUDED.status,
      quantity          = EXCLUDED.quantity;

/* @name removeLineItems */
DELETE
FROM "StockTransferLineItem"
WHERE "stockTransferId" = :stockTransferId!;

/* @name getLineItems */
SELECT *
FROM "StockTransferLineItem"
WHERE "stockTransferId" = :stockTransferId!;
