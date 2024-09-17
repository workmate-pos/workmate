-- AlterTable
ALTER TABLE "ShopifyOrderLineItem" ADD COLUMN     "quantitySourcedFromInventory" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ShopifyOrderLineItem" ALTER COLUMN "quantitySourcedFromInventory" DROP DEFAULT;
