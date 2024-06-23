/*
  Warnings:

  - The values [RESTOCKED] on the enum `StockTransferLineItemStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StockTransferLineItemStatus_new" AS ENUM ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'REJECTED');
ALTER TABLE "StockTransferLineItem" ALTER COLUMN "status" TYPE "StockTransferLineItemStatus_new" USING ("status"::text::"StockTransferLineItemStatus_new");
ALTER TYPE "StockTransferLineItemStatus" RENAME TO "StockTransferLineItemStatus_old";
ALTER TYPE "StockTransferLineItemStatus_new" RENAME TO "StockTransferLineItemStatus";
DROP TYPE "StockTransferLineItemStatus_old";
COMMIT;
