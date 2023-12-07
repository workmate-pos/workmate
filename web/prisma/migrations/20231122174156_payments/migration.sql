/*
  Warnings:

  - You are about to drop the column `depositAmount` on the `WorkOrder` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'BALANCE');

-- AlterTable
ALTER TABLE "WorkOrder" DROP COLUMN "depositAmount";

-- CreateTable
CREATE TABLE "WorkOrderPayment" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "WorkOrderPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkOrderPayment" ADD CONSTRAINT "WorkOrderPayment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
