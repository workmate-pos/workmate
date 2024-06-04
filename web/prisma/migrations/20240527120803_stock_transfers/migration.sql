-- CreateEnum
CREATE TYPE "StockTransferLineItemStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'RESTOCKED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PermissionNode" ADD VALUE 'read_stock_transfers';
ALTER TYPE "PermissionNode" ADD VALUE 'write_stock_transfers';

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferLineItem" (
    "uuid" UUID NOT NULL,
    "stockTransferId" INTEGER NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "productVariantTitle" TEXT NOT NULL,
    "status" "StockTransferLineItemStatus" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransferLineItem_pkey" PRIMARY KEY ("stockTransferId","uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_shop_name_key" ON "StockTransfer"("shop", "name");

-- AddForeignKey
ALTER TABLE "StockTransferLineItem" ADD CONSTRAINT "StockTransferLineItem_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "StockTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "StockTransfer_updatedAt"
  BEFORE UPDATE ON "StockTransfer"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "StockTransferLineItem_updatedAt"
  BEFORE UPDATE ON "StockTransferLineItem"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
