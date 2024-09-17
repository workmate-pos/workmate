-- DropForeignKey
ALTER TABLE "PurchaseOrderLineItem" DROP CONSTRAINT "PurchaseOrderLineItem_specialOrderLineItemId_fkey";

-- DropForeignKey
ALTER TABLE "SpecialOrderLineItem" DROP CONSTRAINT "SpecialOrderLineItem_shopifyOrderLineItemId_fkey";

-- AlterTable
ALTER TABLE "SpecialOrderLineItem" ALTER COLUMN "shopifyOrderLineItemId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLineItem" ADD CONSTRAINT "PurchaseOrderLineItem_specialOrderLineItemId_fkey" FOREIGN KEY ("specialOrderLineItemId") REFERENCES "SpecialOrderLineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialOrderLineItem" ADD CONSTRAINT "SpecialOrderLineItem_shopifyOrderLineItemId_fkey" FOREIGN KEY ("shopifyOrderLineItemId") REFERENCES "ShopifyOrderLineItem"("lineItemId") ON DELETE CASCADE ON UPDATE CASCADE;
