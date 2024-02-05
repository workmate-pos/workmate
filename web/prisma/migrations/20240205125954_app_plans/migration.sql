-- CreateEnum
CREATE TYPE "AppPlanName" AS ENUM ('STARTER', 'BASIC', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "AppPlanType" AS ENUM ('DEFAULT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AppPlanInterval" AS ENUM ('EVERY_30_DAYS', 'ANNUAL');

-- CreateTable
CREATE TABLE "AppPlanSubscription" (
    "appSubscriptionShopifyId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "appSubscriptionStatus" TEXT NOT NULL,
    "appPlanId" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppPlanSubscription_pkey" PRIMARY KEY ("shop")
);

-- CreateTable
CREATE TABLE "AppPlan" (
    "id" SERIAL NOT NULL,
    "name" "AppPlanName" NOT NULL,
    "type" "AppPlanType" NOT NULL,
    "price" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "interval" "AppPlanInterval" NOT NULL,
    "trialDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppPlanCustomAccess" (
    "appPlanId" INTEGER NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "AppPlanCustomAccess_pkey" PRIMARY KEY ("appPlanId")
);

-- AddForeignKey
ALTER TABLE "AppPlanSubscription" ADD CONSTRAINT "AppPlanSubscription_appPlanId_fkey" FOREIGN KEY ("appPlanId") REFERENCES "AppPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppPlanCustomAccess" ADD CONSTRAINT "AppPlanCustomAccess_appPlanId_fkey" FOREIGN KEY ("appPlanId") REFERENCES "AppPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
