/*
  Warnings:

  - The values [BASIC,ADVANCED,PLUS] on the enum `ShopifyPlan` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
ALTER TYPE "ShopifyPlan" RENAME VALUE 'BASIC' TO 'BASIC_SHOPIFY';
ALTER TYPE "ShopifyPlan" RENAME VALUE 'ADVANCED' TO 'ADVANCED_SHOPIFY';
ALTER TYPE "ShopifyPlan" RENAME VALUE 'PLUS' TO 'SHOPIFY_PLUS';
ALTER TYPE "ShopifyPlan" ADD VALUE 'SHOPIFY_PLUS_PARTNER_SANDBOX';
ALTER TYPE "ShopifyPlan" ADD VALUE 'PARTNER_DEVELOPMENT';
ALTER TYPE "ShopifyPlan" ADD VALUE 'DEVELOPMENT';
ALTER TYPE "ShopifyPlan" ADD VALUE 'STAFF';
COMMIT;
