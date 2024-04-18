/*
  Warnings:

  - Added the required column `productType` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productType" TEXT NOT NULL DEFAULT '';
ALtER TABLE "Product" ALTER COLUMN "productType" DROP DEFAULT;
