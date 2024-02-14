-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('OPEN', 'RECEIVED', 'CANCELLED', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PermissionNode" ADD VALUE 'read_purchase_orders';
ALTER TYPE "PermissionNode" ADD VALUE 'write_purchase_orders';

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "locationId" TEXT,
    "customerId" TEXT,
    "vendorCustomerId" TEXT,
    "orderId" TEXT,
    "subtotal" TEXT,
    "discount" TEXT,
    "tax" TEXT,
    "shipping" TEXT,
    "deposited" TEXT,
    "paid" TEXT,
    "name" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL,
    "workOrderName" TEXT,
    "shipFrom" TEXT,
    "shipTo" TEXT,
    "note" TEXT,
    "vendorName" TEXT,
    "customerName" TEXT,
    "locationName" TEXT,
    "orderName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderCustomField" (
    "id" SERIAL NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "PurchaseOrderCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderProduct" (
    "id" SERIAL NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sku" TEXT,
    "name" TEXT,
    "handle" TEXT,

    CONSTRAINT "PurchaseOrderProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderEmployeeAssignment" (
    "id" SERIAL NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT,

    CONSTRAINT "PurchaseOrderEmployeeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_shop_name_key" ON "PurchaseOrder"("shop", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderCustomField_purchaseOrderId_key_key" ON "PurchaseOrderCustomField"("purchaseOrderId", "key");

-- CreateIndex
CREATE INDEX "PurchaseOrderProduct_purchaseOrderId_idx" ON "PurchaseOrderProduct"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "FixedPriceLabour_workOrderId_idx" ON "FixedPriceLabour"("workOrderId");

-- CreateIndex
CREATE INDEX "HourlyLabour_workOrderId_idx" ON "HourlyLabour"("workOrderId");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_shop_workOrderName_fkey" FOREIGN KEY ("shop", "workOrderName") REFERENCES "WorkOrder"("shop", "name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderCustomField" ADD CONSTRAINT "PurchaseOrderCustomField_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderProduct" ADD CONSTRAINT "PurchaseOrderProduct_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderEmployeeAssignment" ADD CONSTRAINT "PurchaseOrderEmployeeAssignment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
