-- we need to add COALESCE(locationId, '') to the unique index to prevent duplication NULL location ids
-- but first we must delete all duplicate null locations except for the newest one

WITH "ReorderPointsToKeep" AS (SELECT rp.shop, rp."locationId", rp."inventoryItemId", MAX(rp.id) AS "maxId"
                                 FROM "ReorderPoint" rp
                                 WHERE rp."locationId" IS NULL
                                 GROUP BY rp.shop, rp."locationId", rp."inventoryItemId")
DELETE
FROM "ReorderPoint"
WHERE id NOT IN (SELECT "maxId" FROM "ReorderPointsToKeep");

CREATE UNIQUE INDEX "ReorderPoint_shop_locationId_coalesce_inventoryItemId_key" ON "ReorderPoint" ("shop", "inventoryItemId", COALESCE("locationId", ''));
