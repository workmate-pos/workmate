/*
  Warnings:

  - You are about to drop the `EmployeeAssignment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmployeeAssignment" DROP CONSTRAINT "EmployeeAssignment_workOrderId_fkey";

-- DropTable
DROP TABLE "EmployeeAssignment";

-- CreateTable
CREATE TABLE "FixedPriceLabour" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "lineItemUuid" TEXT,
    "productVariantId" TEXT,
    "employeeId" TEXT,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "FixedPriceLabour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourlyLabour" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "lineItemUuid" TEXT,
    "productVariantId" TEXT,
    "employeeId" TEXT,
    "name" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "hours" INTEGER NOT NULL,

    CONSTRAINT "HourlyLabour_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FixedPriceLabour" ADD CONSTRAINT "FixedPriceLabour_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourlyLabour" ADD CONSTRAINT "HourlyLabour_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
