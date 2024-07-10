/*
  Warnings:

  - Added the required column `email` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Employee" ALTER COLUMN "email" DROP DEFAULT;
