/*
  Warnings:

  - The values [STARTER,BASIC,PREMIUM] on the enum `AppPlanName` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `price` on the `AppPlan` table. All the data in the column will be lost.
  - You are about to drop the `EmployeeRate` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `basePrice` to the `AppPlan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PermissionNode" AS ENUM ('read_settings', 'write_settings', 'read_employees', 'write_employees', 'read_work_orders', 'write_work_orders', 'read_app_plan', 'write_app_plan');

-- CreateEnum
CREATE TYPE "ShopifyPlan" AS ENUM ('BASIC', 'SHOPIFY', 'ADVANCED', 'PLUS');

-- AlterEnum
BEGIN;
CREATE TYPE "AppPlanName_new" AS ENUM ('FREE', 'ESSENTIAL', 'ENTERPRISE');
ALTER TABLE "AppPlan" ALTER COLUMN "name" TYPE "AppPlanName_new" USING ("name"::text::"AppPlanName_new");
ALTER TYPE "AppPlanName" RENAME TO "AppPlanName_old";
ALTER TYPE "AppPlanName_new" RENAME TO "AppPlanName";
DROP TYPE "AppPlanName_old";
COMMIT;

-- AlterTable
ALTER TABLE "AppPlan" DROP COLUMN "price",
ADD COLUMN     "allowedShopifyPlans" "ShopifyPlan"[],
ADD COLUMN     "basePrice" INTEGER NOT NULL,
ADD COLUMN     "extraLocationPrices" INTEGER[],
ADD COLUMN     "maxLocations" INTEGER;

-- DropTable
DROP TABLE "EmployeeRate";

-- CreateTable
CREATE TABLE "Employee" (
    "employeeId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "superuser" BOOLEAN NOT NULL,
    "permissions" "PermissionNode"[],
    "rate" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("shop","employeeId")
);

-- Seed app plans
INSERT INTO "AppPlan" (name, type, "currencyCode", interval, "trialDays", "basePrice", "extraLocationPrices", "maxLocations", "allowedShopifyPlans")
VALUES ('FREE', 'DEFAULT', 'USD', 'EVERY_30_DAYS', 14, 0, ARRAY[50, 45, 40, 35], NULL, ARRAY['BASIC', 'SHOPIFY', 'ADVANCED', 'PLUS'] :: "ShopifyPlan"[]),
       ('ESSENTIAL', 'DEFAULT', 'USD', 'EVERY_30_DAYS', 14, 50, ARRAY[50, 45, 40, 35], NULL, ARRAY['BASIC'] :: "ShopifyPlan"[]),
       ('ESSENTIAL', 'DEFAULT', 'USD', 'EVERY_30_DAYS', 14, 75, ARRAY[50, 45, 40, 35], NULL, ARRAY['SHOPIFY'] :: "ShopifyPlan"[]),
       ('ESSENTIAL', 'DEFAULT', 'USD', 'EVERY_30_DAYS', 14, 100, ARRAY[50, 45, 40, 35], NULL, ARRAY['ADVANCED'] :: "ShopifyPlan"[]);
