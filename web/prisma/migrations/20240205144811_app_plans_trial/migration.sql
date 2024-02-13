/*
  Warnings:

  - The primary key for the `AppPlanCustomAccess` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "AppPlanCustomAccess" DROP CONSTRAINT "AppPlanCustomAccess_pkey",
ADD CONSTRAINT "AppPlanCustomAccess_pkey" PRIMARY KEY ("appPlanId", "shop");

-- CreateTable
CREATE TABLE "AppPlanSubscriptionTrials" (
    "shop" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppPlanSubscriptionTrials_pkey" PRIMARY KEY ("shop")
);
