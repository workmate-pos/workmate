-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "discountAmount" TEXT,
ADD COLUMN     "discountType" "DiscountType";
