-- CreateEnum
CREATE TYPE "AppPlanCustomAccessType" AS ENUM ('DEFAULT', 'TEST');

-- AlterTable
ALTER TABLE "AppPlanCustomAccess" ADD COLUMN     "type" "AppPlanCustomAccessType" NOT NULL DEFAULT 'DEFAULT';
