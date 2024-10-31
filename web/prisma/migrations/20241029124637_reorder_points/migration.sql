-- CreateTable
CREATE TABLE "ReorderPoint"
(
  "id"              SERIAL         NOT NULL,
  "shop"            TEXT           NOT NULL,
  "inventoryItemId" TEXT           NOT NULL,
  "locationId"      TEXT,
  "min"             INTEGER        NOT NULL,
  "max"             INTEGER        NOT NULL,
  "createdAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReorderPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryQuantity"
(
  "id"              SERIAL         NOT NULL,
  "shop"            TEXT           NOT NULL,
  "inventoryItemId" TEXT           NOT NULL,
  "locationId"      TEXT           NOT NULL,
  "name"            TEXT           NOT NULL,
  "quantity"        INTEGER        NOT NULL,
  "createdAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InventoryQuantity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReorderPoint_shop_locationId_inventoryItemId_key" ON "ReorderPoint" ("shop", "locationId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryQuantity_shop_locationId_inventoryItemId_name_key" ON "InventoryQuantity" ("shop", "locationId", "inventoryItemId", name);

CREATE TRIGGER "ReorderPoint_updatedAt"
  BEFORE UPDATE
  ON "ReorderPoint"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "InventoryQuantity_updatedAt"
  BEFORE UPDATE
  ON "InventoryQuantity"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
