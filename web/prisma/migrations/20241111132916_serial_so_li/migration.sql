-- CreateTable
CREATE TABLE "ShopifyOrderLineItemProductVariantSerial"
(
  "id"                     SERIAL         NOT NULL,
  "lineItemId"             TEXT           NOT NULL,
  "productVariantSerialId" INTEGER        NOT NULL,
  "createdAt"              TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ShopifyOrderLineItemProductVariantSerial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopifyOrderLineItemProductVariantSerial_lineItemId_idx" ON "ShopifyOrderLineItemProductVariantSerial" ("lineItemId");

-- AddForeignKey
ALTER TABLE "ShopifyOrderLineItemProductVariantSerial"
  ADD CONSTRAINT "ShopifyOrderLineItemProductVariantSerial_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "ShopifyOrderLineItem" ("lineItemId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyOrderLineItemProductVariantSerial"
  ADD CONSTRAINT "ShopifyOrderLineItemProductVariantSerial_productVariantSer_fkey" FOREIGN KEY ("productVariantSerialId") REFERENCES "ProductVariantSerial" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "ShopifyOrderLineItemProductVariantSerial_updatedAt"
  BEFORE UPDATE
  ON "ShopifyOrderLineItemProductVariantSerial"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
