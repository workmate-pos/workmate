/*
  Warnings:

  - You are about to drop the column `displayName` on the `ProductVariant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product"
  ADD COLUMN "hasOnlyDefaultVariant" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Product"
  ALTER COLUMN "hasOnlyDefaultVariant" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductVariant"
  DROP COLUMN "displayName";

UPDATE "Product" p
SET "hasOnlyDefaultVariant" = (SELECT COUNT(*) <= 1
                               FROM "ProductVariant" pv
                               WHERE pv."productId" = p."productId");
