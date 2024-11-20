/*
  Warnings:

  - Added the required column `receivedAt` to the `PurchaseOrderReceipt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PurchaseOrderReceipt"
  ADD COLUMN "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW();

ALTER TABLE "PurchaseOrderReceipt"
  ALTER COLUMN "receivedAt" DROP DEFAULT;

UPDATE "PurchaseOrderReceipt"
SET "receivedAt" = "createdAt";
