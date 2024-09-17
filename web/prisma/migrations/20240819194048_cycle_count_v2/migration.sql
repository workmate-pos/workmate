-- CreateTable
CREATE TABLE "CycleCount" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleCountItem" (
    "cycleCountId" INTEGER NOT NULL,
    "uuid" UUID NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "countQuantity" INTEGER NOT NULL,
    "productTitle" TEXT NOT NULL,
    "productVariantTitle" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleCountItem_pkey" PRIMARY KEY ("cycleCountId","uuid")
);

-- CreateTable
CREATE TABLE "CycleCountItemApplication" (
    "id" SERIAL NOT NULL,
    "cycleCountItemUuid" UUID NOT NULL,
    "cycleCountId" INTEGER NOT NULL,
    "appliedQuantity" INTEGER NOT NULL,
    "originalQuantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleCountItemApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "last_value" INTEGER NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CycleCount_shop_name_key" ON "CycleCount"("shop", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Counter_key_key" ON "Counter"("key");

-- AddForeignKey
ALTER TABLE "CycleCountItem" ADD CONSTRAINT "CycleCountItem_cycleCountId_fkey" FOREIGN KEY ("cycleCountId") REFERENCES "CycleCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountItemApplication" ADD CONSTRAINT "CycleCountItemApplication_cycleCountId_cycleCountItemUuid_fkey" FOREIGN KEY ("cycleCountId", "cycleCountItemUuid") REFERENCES "CycleCountItem"("cycleCountId", "uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
