/*
  Warnings:

  - Added the required column `amountLocked` to the `WorkOrderFixedPriceLabourCharge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hoursLocked` to the `WorkOrderHourlyLabourCharge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rateLocked` to the `WorkOrderHourlyLabourCharge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WorkOrderFixedPriceLabourCharge" ADD COLUMN     "amountLocked" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN     "removeLocked" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "WorkOrderFixedPriceLabourCharge" ALTER COLUMN "amountLocked" DROP DEFAULT,
  ALTER COLUMN "removeLocked" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WorkOrderHourlyLabourCharge" ADD COLUMN     "hoursLocked" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN     "rateLocked" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN     "removeLocked" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "WorkOrderHourlyLabourCharge" ALTER COLUMN "hoursLocked" DROP DEFAULT,
ALTER COLUMN "rateLocked" DROP DEFAULT,
  ALTER COLUMN "removeLocked" DROP DEFAULT;
