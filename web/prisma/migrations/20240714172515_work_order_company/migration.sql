-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "companyId" TEXT DEFAULT NULL;
ALTER TABLE "WorkOrder" ADD COLUMN     "companyLocationId" TEXT DEFAULT NULL;
ALTER TABLE "WorkOrder" ADD COLUMN     "companyContactId" TEXT DEFAULT NULL;

-- Drop Default
ALTER TABLE "WorkOrder" ALTER COLUMN "companyLocationId" DROP DEFAULT;
ALTER TABLE "WorkOrder" ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE "WorkOrder" ALTER COLUMN "companyContactId" DROP DEFAULT;
