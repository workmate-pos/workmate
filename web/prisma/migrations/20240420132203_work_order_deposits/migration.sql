/*
  Warnings:

  - Added the required column `depositedAmount` to the `WorkOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `depositedReconciledAmount` to the `WorkOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WorkOrder"
  ADD COLUMN "depositedAmount"           TEXT NOT NULL DEFAULT '0.00',
  ADD COLUMN "depositedReconciledAmount" TEXT NOT NULL DEFAULT '0.00';

ALTER TABLE "WorkOrder"
  ALTER COLUMN "depositedAmount" DROP DEFAULT,
  ALTER COLUMN "depositedReconciledAmount" DROP DEFAULT;
