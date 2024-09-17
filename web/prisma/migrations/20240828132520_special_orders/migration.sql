-- AlterTable
ALTER TABLE "PurchaseOrderLineItem" ADD COLUMN     "specialOrderLineItemId" INTEGER;

-- CreateTable
CREATE TABLE "SpecialOrder" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "companyId" TEXT,
    "companyContactId" TEXT,
    "companyLocationId" TEXT,
    "requiredBy" TIMESTAMP(3),
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialOrderLineItem" (
    "id" SERIAL NOT NULL,
    "specialOrderId" INTEGER NOT NULL,
    "uuid" UUID NOT NULL,
    "shopifyOrderLineItemId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialOrderLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpecialOrder_shop_name_key" ON "SpecialOrder"("shop", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialOrderLineItem_specialOrderId_uuid_key" ON "SpecialOrderLineItem"("specialOrderId", "uuid");

-- AddForeignKey
ALTER TABLE "PurchaseOrderLineItem" ADD CONSTRAINT "PurchaseOrderLineItem_specialOrderLineItemId_fkey" FOREIGN KEY ("specialOrderLineItemId") REFERENCES "SpecialOrderLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialOrder" ADD CONSTRAINT "SpecialOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("customerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialOrder" ADD CONSTRAINT "SpecialOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("locationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialOrderLineItem" ADD CONSTRAINT "SpecialOrderLineItem_specialOrderId_fkey" FOREIGN KEY ("specialOrderId") REFERENCES "SpecialOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialOrderLineItem" ADD CONSTRAINT "SpecialOrderLineItem_shopifyOrderLineItemId_fkey" FOREIGN KEY ("shopifyOrderLineItemId") REFERENCES "ShopifyOrderLineItem"("lineItemId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialOrderLineItem" ADD CONSTRAINT "SpecialOrderLineItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("productVariantId") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE TRIGGER "SpecialOrder_updatedAt"
    BEFORE UPDATE ON "SpecialOrder"
    FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "SpecialOrderLineItem_updatedAt"
    BEFORE UPDATE ON "SpecialOrderLineItem"
    FOR EACH ROW
EXECUTE PROCEDURE updated_at();

