-- AlterTable
ALTER TABLE "StockTransferLineItem" ADD COLUMN     "purchaseOrderId" INTEGER,
ADD COLUMN     "purchaseOrderLineItemUuid" UUID;

-- AddForeignKey
ALTER TABLE "StockTransferLineItem" ADD CONSTRAINT "StockTransferLineItem_purchaseOrderId_purchaseOrderLineIte_fkey" FOREIGN KEY ("purchaseOrderId", "purchaseOrderLineItemUuid") REFERENCES "PurchaseOrderLineItem"("purchaseOrderId", "uuid") ON DELETE SET NULL ON UPDATE CASCADE;
