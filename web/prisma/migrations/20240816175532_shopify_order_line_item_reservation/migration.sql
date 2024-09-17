/*
  Warnings:

  - You are about to drop the column `quantitySourcedFromInventory` on the `ShopifyOrderLineItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ShopifyOrderLineItem" DROP COLUMN "quantitySourcedFromInventory";

-- CreateTable
CREATE TABLE "ShopifyOrderLineItemReservation" (
    "lineItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ShopifyOrderLineItemReservation_pkey" PRIMARY KEY ("lineItemId")
);

-- CreateIndex
CREATE INDEX "ShopifyOrderLineItemReservation_locationId_idx" ON "ShopifyOrderLineItemReservation"("locationId");
