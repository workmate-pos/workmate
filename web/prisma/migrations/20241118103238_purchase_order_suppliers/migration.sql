/*
  Warnings:

  - You are about to drop the column `vendorName` on the `PurchaseOrder` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `supplierId` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PurchaseOrder"
  ADD COLUMN "supplierId" INTEGER DEFAULT NULL;

-- AddForeignKey
ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- To migrate from vendors to suppliers, we create a new supplier for each vendor of a shop.
WITH "SuppliersToCreate" AS (SElECT po.shop, po."vendorName"
                             FROM "PurchaseOrder" po
                             GROUP BY po.shop, po."vendorName"),
     "CreateSuppliers" AS (
       INSERT INTO "Supplier" (shop, name)
         SELECT s.shop, s."vendorName"
         FROM "SuppliersToCreate" s
         WHERE s."vendorName" IS NOT NULL
         RETURNING *)
UPDATE "PurchaseOrder" po
SET "supplierId" = s.id
FROM "CreateSuppliers" s
WHERE s.shop = po.shop
  AND s.name = po."vendorName";

-- AlterTable
ALTER TABLE "PurchaseOrder"
  DROP COLUMN "vendorName",
  ALTER COLUMN "supplierId" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier" ("name");

