-- CreateTable
CREATE TABLE "Supplier"
(
  "id"        SERIAL         NOT NULL,
  "shop"      TEXT           NOT NULL,
  "name"      TEXT           NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariantSupplier"
(
  "id"               SERIAL         NOT NULL,
  "productVariantId" TEXT           NOT NULL,
  "supplierId"       INTEGER        NOT NULL,
  "createdAt"        TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductVariantSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductVariantSupplier_productVariantId_supplierId_idx" ON "ProductVariantSupplier" ("productVariantId", "supplierId");

-- CreateIndex
CREATE INDEX "ProductVariantSupplier_supplierId_idx" ON "ProductVariantSupplier" ("supplierId");

-- AddForeignKey
ALTER TABLE "ProductVariantSupplier"
  ADD CONSTRAINT "ProductVariantSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE TRIGGER "ProductVariantSupplier_updatedAt"
  BEFORE UPDATE
  ON "ProductVariantSupplier"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "Supplier_updatedAt"
  BEFORE UPDATE
  ON "Supplier"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
