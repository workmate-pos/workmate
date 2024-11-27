DROP INDEX "ReorderPoint_shop_locationId_coalesce_inventoryItemId_key";

DROP INDEX "ReorderPoint_shop_locationId_inventoryItemId_key";

CREATE UNIQUE INDEX "ReorderPoint_shop_locationId_inventoryItemId_key" ON "ReorderPoint" ("shop", "locationId", "inventoryItemId") NULLS NOT DISTINCT;
