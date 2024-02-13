/*
  Warnings:

  - Added the required column `trialOnly` to the `AppPlan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AppPlan" ADD COLUMN     "trialOnly" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "AppPlan" ALTER COLUMN "trialOnly" DROP DEFAULT;

UPDATE "AppPlan"
SET "trialOnly" = TRUE
WHERE name = 'FREE';

UPDATE "AppPlan"
SET "trialDays" = 0
WHERE name != 'FREE';
