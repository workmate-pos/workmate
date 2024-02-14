-- CreateTable
CREATE TABLE "PurchaseOrderCustomFieldsPreset" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keys" TEXT[],

    CONSTRAINT "PurchaseOrderCustomFieldsPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderCustomFieldsPreset_shop_name_key" ON "PurchaseOrderCustomFieldsPreset"("shop", "name");
