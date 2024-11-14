/*
  Warnings:

  - Added the required column `sold` to the `ProductVariantSerial` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductVariantSerial"
  ADD COLUMN "sold" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductVariantSerial"
  ALTER COLUMN "sold" DROP DEFAULT;
