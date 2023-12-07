-- CreateTable
CREATE TABLE "WorkOrderService" (
    "id" SERIAL NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "workOrderId" INTEGER NOT NULL,

    CONSTRAINT "WorkOrderService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderServiceEmployeeAssignment" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeRate" INTEGER NOT NULL,
    "hours" INTEGER NOT NULL,
    "workOrderServiceId" INTEGER NOT NULL,

    CONSTRAINT "WorkOrderServiceEmployeeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeRate" (
    "employeeId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,

    CONSTRAINT "EmployeeRate_pkey" PRIMARY KEY ("employeeId","shop")
);

-- AddForeignKey
ALTER TABLE "WorkOrderService" ADD CONSTRAINT "WorkOrderService_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderServiceEmployeeAssignment" ADD CONSTRAINT "WorkOrderServiceEmployeeAssignment_workOrderServiceId_fkey" FOREIGN KEY ("workOrderServiceId") REFERENCES "WorkOrderService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
