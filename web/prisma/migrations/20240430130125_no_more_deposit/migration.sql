/*
  Warnings:

  - You are about to drop the `WorkOrderDeposit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WorkOrderDeposit" DROP CONSTRAINT "WorkOrderDeposit_shopifyOrderLineItemId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderDeposit" DROP CONSTRAINT "WorkOrderDeposit_workOrderId_fkey";

-- DropTable
DROP TABLE "WorkOrderDeposit";
