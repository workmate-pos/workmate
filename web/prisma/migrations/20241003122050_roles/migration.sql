/*
  Warnings:

  - Added the required column `role` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employee"
  ADD COLUMN "role" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Employee"
  ALTER COLUMN "role" DROP DEFAULT;
