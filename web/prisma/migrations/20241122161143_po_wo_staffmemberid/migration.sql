/*
  Warnings:

  - Added the required column `staffMemberId` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PurchaseOrder"
  ADD COLUMN "staffMemberId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder"
  ADD COLUMN "staffMemberId" TEXT;
