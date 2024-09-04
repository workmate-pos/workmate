-- AlterTable
ALTER TABLE "PurchaseOrderLineItem" ADD COLUMN     "productVariantSerialId" INTEGER;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLineItem" ADD CONSTRAINT "PurchaseOrderLineItem_productVariantSerialId_fkey" FOREIGN KEY ("productVariantSerialId") REFERENCES "ProductVariantSerial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
