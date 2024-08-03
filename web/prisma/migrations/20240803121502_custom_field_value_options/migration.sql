-- CreateTable
CREATE TABLE "CustomFieldValueOptions" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "values" TEXT[],

    CONSTRAINT "CustomFieldValueOptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValueOptions_shop_name_key" ON "CustomFieldValueOptions"("shop", "name");
