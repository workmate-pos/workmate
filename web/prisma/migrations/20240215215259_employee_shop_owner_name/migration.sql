/*
  Warnings:

  - Added the required column `isShopOwner` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "isShopOwner" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';

-- Get rid of the default values
ALTER TABLE "Employee" ALTER COLUMN "isShopOwner" DROP DEFAULT;
ALTER TABLE "Employee" ALTER COLUMN "name" DROP DEFAULT;
