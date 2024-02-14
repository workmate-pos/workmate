/*
  Warnings:

  - Added the required column `availableQuantity` to the `PurchaseOrderProduct` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inventoryItemId` to the `PurchaseOrderProduct` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PurchaseOrderProduct" ADD COLUMN     "availableQuantity" INTEGER NOT NULL,
ADD COLUMN     "inventoryItemId" TEXT NOT NULL;
