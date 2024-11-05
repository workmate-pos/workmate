/*
  Warnings:

  - A unique constraint covering the columns `[shop,name]` on the table `PurchaseOrderReceipt` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shop` to the `PurchaseOrderReceipt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PurchaseOrderReceipt"
  ADD COLUMN "shop" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderReceipt_shop_name_key" ON "PurchaseOrderReceipt" ("shop", "name");
