/*
  Warnings:

  - Added the required column `default` to the `CustomFieldsPreset` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CustomFieldsPreset"
  ADD COLUMN "default" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "CustomFieldsPreset"
  ALTER COLUMN "default" DROP DEFAULT;
