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
CREATE TABLE "SupplierProductVariant"
(
  "id"               SERIAL         NOT NULL,
  "productVariantId" TEXT           NOT NULL,
  "supplierId"       INTEGER        NOT NULL,
  "createdAt"        TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupplierProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierProductVariant_supplierId_productVariantId_idx" ON "SupplierProductVariant" ("supplierId", "productVariantId");

-- CreateIndex
CREATE INDEX "SupplierProductVariant_productVariantId_idx" ON "SupplierProductVariant" ("productVariantId");

-- AddForeignKey
ALTER TABLE "SupplierProductVariant"
  ADD CONSTRAINT "SupplierProductVariant_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE TRIGGER "SupplierProductVariant_updatedAt"
  BEFORE UPDATE
  ON "SupplierProductVariant"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "Supplier_updatedAt"
  BEFORE UPDATE
  ON "Supplier"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

-- AlterTable
ALTER TABLE "PurchaseOrder"
  ADD COLUMN "supplierId" INTEGER DEFAULT NULL;

-- AddForeignKey
ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "SupplierVendor"
(
  "id"         SERIAL         NOT NULL,
  "supplierId" INTEGER        NOT NULL,
  "vendor"     TEXT           NOT NULL,
  "createdAt"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupplierVendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierVendor_supplierId_vendor_key" ON "SupplierVendor" ("supplierId", "vendor");

-- AddForeignKey
ALTER TABLE "SupplierVendor"
  ADD CONSTRAINT "SupplierVendor_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- To migrate from vendors to suppliers, we create a new supplier for each vendor of a shop and add the vendor to the supplier.
WITH "SuppliersToCreate" AS (SElECT po.shop, po."vendorName"
                             FROM "PurchaseOrder" po
                             GROUP BY po.shop, po."vendorName"),
     "CreateSuppliers" AS (
       INSERT INTO "Supplier" (shop, name)
         SELECT s.shop, s."vendorName"
         FROM "SuppliersToCreate" s
         WHERE s."vendorName" IS NOT NULL
         RETURNING *),
     "InsertSupplierVendors" AS (
       INSERT INTO "SupplierVendor" ("supplierId", vendor)
         SELECT s.id, s.name
         FROM "CreateSuppliers" s)
UPDATE "PurchaseOrder" po
SET "supplierId" = s.id
FROM "CreateSuppliers" s
WHERE s.shop = po.shop
  AND s.name = po."vendorName";

-- AlterTable
ALTER TABLE "PurchaseOrder"
  DROP COLUMN "vendorName",
  ALTER COLUMN "supplierId" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier" ("name");

-- DropIndex
DROP INDEX "Supplier_name_key";

-- CreateIndex
CREATE INDEX "LongRunningTask_name_idx" ON "LongRunningTask" ("name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_shop_name_key" ON "Supplier" ("shop", "name");

CREATE TRIGGER "SupplierVendor_updatedAt"
  BEFORE UPDATE
  ON "SupplierVendor"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
