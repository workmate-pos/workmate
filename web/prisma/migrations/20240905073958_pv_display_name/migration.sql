/*
  Warnings:

  - Added the required column `displayName` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductVariant"
  ADD COLUMN "displayName" TEXT NOT NULL DEFAULT '';

UPDATE "ProductVariant" pv
SET "displayName" = p."title" || (CASE WHEN pv.title = 'Default Title' THEN '' ELSE ' - ' || pv.title END)
FROM "Product" p
WHERE pv."productId" = p."productId";

ALTER TABLE "ProductVariant"
  ALTER COLUMN "displayName" DROP DEFAULT;
