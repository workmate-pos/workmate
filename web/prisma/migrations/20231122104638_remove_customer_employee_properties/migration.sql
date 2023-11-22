/*
  Warnings:

  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Employee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShopifyStoreProperties` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmployeeAssignment" DROP CONSTRAINT "EmployeeAssignment_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_customerId_fkey";

-- DropTable
DROP TABLE "Customer";

-- DropTable
DROP TABLE "Employee";

-- DropTable
DROP TABLE "ShopifyStoreProperties";
