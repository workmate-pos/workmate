/*
  Warnings:

  - Added the required column `locked` to the `CycleCount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CycleCount"
  ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "CycleCount"
  ALTER COLUMN "locked" DROP DEFAULT;
