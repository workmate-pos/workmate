/*
  Warnings:

  - Added the required column `internalNote` to the `WorkOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WorkOrder"
  ADD COLUMN "internalNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WorkOrder"
  ALTER COLUMN "internalNote" DROP DEFAULT;
