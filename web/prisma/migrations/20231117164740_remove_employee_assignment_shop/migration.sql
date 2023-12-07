/*
  Warnings:

  - You are about to drop the column `shop` on the `EmployeeAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `WorkOrderProduct` table. All the data in the column will be lost.
  - Added the required column `productVariantId` to the `WorkOrderProduct` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmployeeAssignment" DROP COLUMN "shop";

-- AlterTable
ALTER TABLE "WorkOrderProduct" RENAME COLUMN "productId" TO "productVariantId";
