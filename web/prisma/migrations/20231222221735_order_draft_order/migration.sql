/*
  Warnings:

  - The primary key for the `EmployeeRate` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `description` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `discountAmount` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `shippingAmount` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `taxAmount` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the `WorkOrderPayment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkOrderProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkOrderService` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkOrderServiceEmployeeAssignment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `hours` to the `EmployeeAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rate` to the `EmployeeAssignment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "WorkOrderPayment" DROP CONSTRAINT "WorkOrderPayment_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderProduct" DROP CONSTRAINT "WorkOrderProduct_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderService" DROP CONSTRAINT "WorkOrderService_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderServiceEmployeeAssignment" DROP CONSTRAINT "WorkOrderServiceEmployeeAssignment_workOrderServiceId_fkey";

-- AlterTable
ALTER TABLE "EmployeeAssignment" ADD COLUMN     "hours" INTEGER NOT NULL,
ADD COLUMN     "lineItemUuid" TEXT,
ADD COLUMN     "productVariantId" TEXT,
ADD COLUMN     "rate" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "EmployeeRate" DROP CONSTRAINT "EmployeeRate_pkey",
ADD CONSTRAINT "EmployeeRate_pkey" PRIMARY KEY ("shop", "employeeId");

-- AlterTable
ALTER TABLE "WorkOrder" DROP COLUMN "description",
DROP COLUMN "discountAmount",
DROP COLUMN "shippingAmount",
DROP COLUMN "taxAmount",
ADD COLUMN     "draftOrderId" TEXT,
ADD COLUMN     "orderId" TEXT;

-- DropTable
DROP TABLE "WorkOrderPayment";

-- DropTable
DROP TABLE "WorkOrderProduct";

-- DropTable
DROP TABLE "WorkOrderService";

-- DropTable
DROP TABLE "WorkOrderServiceEmployeeAssignment";

-- DropEnum
DROP TYPE "PaymentType";

-- CreateIndex
CREATE INDEX "EmployeeAssignment_workOrderId_idx" ON "EmployeeAssignment"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrder_draftOrderId_idx" ON "WorkOrder"("draftOrderId");

-- CreateIndex
CREATE INDEX "WorkOrder_orderId_idx" ON "WorkOrder"("orderId");
