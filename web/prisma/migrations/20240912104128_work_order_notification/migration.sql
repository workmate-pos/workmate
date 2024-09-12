-- CreateTable
CREATE TABLE "WorkOrderNotification" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "notificationUuid" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderNotification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkOrderNotification" ADD CONSTRAINT "WorkOrderNotification_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderNotification" ADD CONSTRAINT "WorkOrderNotification_notificationUuid_fkey" FOREIGN KEY ("notificationUuid") REFERENCES "Notification"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
