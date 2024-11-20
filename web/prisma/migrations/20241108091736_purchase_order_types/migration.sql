/*
  Warnings:

  - Added the required column `type` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PurchaseOrderType" AS ENUM ('NORMAL', 'DROPSHIP');

-- AlterTable
ALTER TABLE "PurchaseOrder"
  ADD COLUMN "type" "PurchaseOrderType" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "PurchaseOrder"
  ALTER COLUMN "type" DROP DEFAULT;
