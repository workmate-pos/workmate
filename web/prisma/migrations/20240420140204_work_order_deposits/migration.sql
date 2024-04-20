-- CreateTable
CREATE TABLE "WorkOrderDeposit" (
    "workOrderId" INTEGER NOT NULL,
    "uuid" UUID NOT NULL,
    "shopifyOrderLineItemId" TEXT,
    "amount" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderDeposit_pkey" PRIMARY KEY ("workOrderId","uuid")
);

-- CreateTable
CREATE TABLE "ShopifyOrderDiscount" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" TEXT NOT NULL,

    CONSTRAINT "ShopifyOrderDiscount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkOrderDeposit" ADD CONSTRAINT "WorkOrderDeposit_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderDeposit" ADD CONSTRAINT "WorkOrderDeposit_shopifyOrderLineItemId_fkey" FOREIGN KEY ("shopifyOrderLineItemId") REFERENCES "ShopifyOrderLineItem"("lineItemId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyOrderDiscount" ADD CONSTRAINT "ShopifyOrderDiscount_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopifyOrder"("orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ShopifyOrderDiscount" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                   ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TRIGGER "ShopifyOrderDiscount_updatedAt"
    BEFORE UPDATE ON "ShopifyOrderDiscount"
    FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "WorkOrderDeposit_updatedAt"
    BEFORE UPDATE ON "WorkOrderDeposit"
    FOR EACH ROW
EXECUTE PROCEDURE updated_at();
