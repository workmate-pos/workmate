/*
  Warnings:

  - Added the required column `discount` to the `ShopifyOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `ShopifyOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShopifyOrder" ADD COLUMN     "discount" TEXT,
ADD COLUMN     "subtotal" TEXT;

UPDATE "ShopifyOrder"
SET discount = '0.00',
    subtotal = total;

ALTER TABLE "ShopifyOrder" ALTER COLUMN "discount" SET NOT NULL;
ALTER TABLE "ShopifyOrder" ALTER COLUMN "subtotal" SET NOT NULL;
