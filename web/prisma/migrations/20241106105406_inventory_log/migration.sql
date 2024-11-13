-- CreateEnum
CREATE TYPE "InventoryMutationType" AS ENUM ('MOVE', 'SET', 'ADJUST');

-- CreateEnum
CREATE TYPE "InventoryMutationInitiatorType" AS ENUM ('PURCHASE_ORDER', 'STOCK_TRANSFER', 'CYCLE_COUNT');

-- CreateTable
CREATE TABLE "InventoryMutation"
(
  "id"            SERIAL                           NOT NULL,
  "shop"          TEXT                             NOT NULL,
  "type"          "InventoryMutationType"          NOT NULL,
  "initiatorType" "InventoryMutationInitiatorType" NOT NULL,
  "initiatorName" TEXT                             NOT NULL,
  "createdAt"     TIMESTAMPTZ(3)                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMPTZ(3)                   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InventoryMutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMutationItem"
(
  "id"                  SERIAL         NOT NULL,
  "inventoryMutationId" INTEGER        NOT NULL,
  "inventoryItemId"     TEXT           NOT NULL,
  "name"                TEXT           NOT NULL,
  "locationId"          TEXT           NOT NULL,
  "compareQuantity"     INTEGER,
  "quantity"            INTEGER,
  "delta"               INTEGER,
  "createdAt"           TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InventoryMutationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryMutation_shop_idx" ON "InventoryMutation" ("shop");

-- AddForeignKey
ALTER TABLE "InventoryMutationItem"
  ADD CONSTRAINT "InventoryMutationItem_inventoryMutationId_fkey" FOREIGN KEY ("inventoryMutationId") REFERENCES "InventoryMutation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE TRIGGER "InventoryMutation_updatedAt"
  BEFORE UPDATE
  ON "InventoryMutation"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "InventoryMutationItem_updatedAt"
  BEFORE UPDATE
  ON "InventoryMutationItem"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
