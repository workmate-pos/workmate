/*
  Warnings:

  - A unique constraint covering the columns `[workOrderId,notificationUuid]` on the table `WorkOrderNotification` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderNotification_workOrderId_notificationUuid_key" ON "WorkOrderNotification"("workOrderId", "notificationUuid");
