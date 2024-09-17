-- AlterTable
ALTER TABLE "WorkOrder"
  ADD COLUMN "productVariantSerialId" INTEGER;

-- CreateTable
CREATE TABLE "ProductVariantSerial"
(
  "id"               SERIAL         NOT NULL,
  "shop"             TEXT           NOT NULL,
  "note"             TEXT           NOT NULL,
  "serial"           TEXT           NOT NULL,
  "productVariantId" TEXT           NOT NULL,
  "customerId"       TEXT,
  "locationId"       TEXT,
  "createdAt"        TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductVariantSerial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariantSerial_shop_productVariantId_serial_key" ON "ProductVariantSerial" ("shop", "productVariantId", "serial");

-- AddForeignKey
ALTER TABLE "WorkOrder"
  ADD CONSTRAINT "WorkOrder_productVariantSerialId_fkey" FOREIGN KEY ("productVariantSerialId") REFERENCES "ProductVariantSerial" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariantSerial"
  ADD CONSTRAINT "ProductVariantSerial_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant" ("productVariantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariantSerial"
  ADD CONSTRAINT "ProductVariantSerial_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("customerId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariantSerial"
  ADD CONSTRAINT "ProductVariantSerial_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("locationId") ON DELETE SET NULL ON UPDATE CASCADE;
