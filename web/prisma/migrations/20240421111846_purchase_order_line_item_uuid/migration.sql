/*
  Warnings:

  - The primary key for the `PurchaseOrderLineItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `PurchaseOrderLineItem` table. All the data in the column will be lost.
  - Added the required column `uuid` to the `PurchaseOrderLineItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PurchaseOrderLineItem" DROP CONSTRAINT "PurchaseOrderLineItem_pkey",
DROP COLUMN "id",
ADD COLUMN     "uuid" UUID NOT NULL,
ADD CONSTRAINT "PurchaseOrderLineItem_pkey" PRIMARY KEY ("purchaseOrderId", "uuid");
