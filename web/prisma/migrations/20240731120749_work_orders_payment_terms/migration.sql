-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "paymentFixedDueDate" TIMESTAMP(3),
ADD COLUMN     "paymentTermsTemplateId" TEXT;
