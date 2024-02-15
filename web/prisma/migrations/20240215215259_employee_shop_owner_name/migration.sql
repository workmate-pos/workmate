/*
  Warnings:

  - Added the required column `isShopOwner` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "isShopOwner" BOOLEAN NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;
