-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "ShopifyStoreProperties" (
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "currencyFormat" TEXT NOT NULL,

    CONSTRAINT "ShopifyStoreProperties_pkey" PRIMARY KEY ("shop")
);
