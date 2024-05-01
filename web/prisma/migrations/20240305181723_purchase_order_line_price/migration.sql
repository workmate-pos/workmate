/*
  Warnings:

  - You are about to drop the column `subtotal` on the `PurchaseOrder` table. All the data in the column will be lost.
  - Added the required column `unitPrice` to the `PurchaseOrderProduct` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PurchaseOrder" DROP COLUMN "subtotal";

-- AlterTable
ALTER TABLE "PurchaseOrderProduct" ADD COLUMN     "unitCost" TEXT NOT NULL DEFAULT '0.00';

-- AlterTable
ALTER TABLE "PurchaseOrderProduct" ALTER COLUMN "unitCost" DROP DEFAULT;
