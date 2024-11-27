/*
  Warnings:

  - You are about to drop the `SupplierProductVariant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SupplierProductVariant" DROP CONSTRAINT "SupplierProductVariant_supplierId_fkey";

-- DropTable
DROP TABLE "SupplierProductVariant";
