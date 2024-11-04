/*
  Warnings:

  - Added the required column `status` to the `PurchaseOrderReceipt` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PurchaseOrderReceiptStatus" AS ENUM ('DRAFT', 'ARCHIVED', 'COMPLETED');

-- AlterTable
ALTER TABLE "PurchaseOrderReceipt"
  ADD COLUMN "status" "PurchaseOrderReceiptStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "PurchaseOrderReceipt"
  ALTER COLUMN "status" DROP DEFAULT;
