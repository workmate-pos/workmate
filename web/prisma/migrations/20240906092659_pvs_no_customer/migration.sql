/*
  Warnings:

  - You are about to drop the column `customerId` on the `ProductVariantSerial` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductVariantSerial" DROP CONSTRAINT "ProductVariantSerial_customerId_fkey";

-- AlterTable
ALTER TABLE "ProductVariantSerial" DROP COLUMN "customerId";
