/*
  Warnings:

  - You are about to drop the column `progress` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `progressMax` on the `Task` table. All the data in the column will be lost.
  - Added the required column `description` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `done` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shop` to the `Task` table without a default value. This is not possible if the table is not empty.

*/


-- Task is renamed to LongRunningTask, and a new Task table is now used for tasks that can be assigned to employees
DROP INDEX "Task_name_key";
ALTER TABLE "Task"
  RENAME TO "LongRunningTask";
ALTER TABLE "LongRunningTask"
  RENAME CONSTRAINT "Task_pkey" TO "LongRunningTask_pkey";

CREATE TABLE "Task"
(
  "id"                   SERIAL         NOT NULL,
  "shop"                 TEXT           NOT NULL,
  "name"                 TEXT           NOT NULL,
  description            TEXT           NOT NULL,
  "estimatedTimeMinutes" INTEGER,
  deadline               TIMESTAMPTZ(3),
  done                   BOOLEAN        NOT NULL,
  "createdAt"            TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAvailability"
(
  "id"            SERIAL         NOT NULL,
  "staffMemberId" TEXT           NOT NULL,
  "available"     BOOLEAN        NOT NULL,
  "shop"          TEXT           NOT NULL,
  "start"         TIMESTAMPTZ(3) NOT NULL,
  "end"           TIMESTAMPTZ(3) NOT NULL,
  "createdAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmployeeAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEvent"
(
  "id"          SERIAL         NOT NULL,
  "scheduleId"  INTEGER        NOT NULL,
  "name"        TEXT           NOT NULL,
  "description" TEXT           NOT NULL,
  "color"       TEXT           NOT NULL,
  "start"       TIMESTAMPTZ(3) NOT NULL,
  "end"         TIMESTAMPTZ(3) NOT NULL,
  "createdAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScheduleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEventAssignment"
(
  "id"             SERIAL         NOT NULL,
  "scheduleItemId" INTEGER        NOT NULL,
  "staffMemberId"  TEXT           NOT NULL,
  "createdAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScheduleEventAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEventTask"
(
  "id"             SERIAL         NOT NULL,
  "scheduleItemId" INTEGER        NOT NULL,
  "taskId"         INTEGER        NOT NULL,
  "createdAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScheduleEventTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskWorkOrderLink"
(
  "id"          SERIAL         NOT NULL,
  "taskId"      INTEGER        NOT NULL,
  "workOrderId" INTEGER        NOT NULL,
  "createdAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskWorkOrderLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskPurchaseOrderLink"
(
  "id"              SERIAL         NOT NULL,
  "taskId"          INTEGER        NOT NULL,
  "purchaseOrderId" INTEGER        NOT NULL,
  "createdAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskPurchaseOrderLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSpecialOrderLink"
(
  "id"             SERIAL         NOT NULL,
  "taskId"         INTEGER        NOT NULL,
  "specialOrderId" INTEGER        NOT NULL,
  "createdAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskSpecialOrderLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskStockTransferLink"
(
  "id"              SERIAL         NOT NULL,
  "taskId"          INTEGER        NOT NULL,
  "stockTransferId" INTEGER        NOT NULL,
  "createdAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskStockTransferLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCycleCountLink"
(
  "id"           SERIAL         NOT NULL,
  "taskId"       INTEGER        NOT NULL,
  "cycleCountId" INTEGER        NOT NULL,
  "createdAt"    TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskCycleCountLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSerialLink"
(
  "id"        SERIAL         NOT NULL,
  "taskId"    INTEGER        NOT NULL,
  "serialId"  INTEGER        NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskSerialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAssignment"
(
  "id"            SERIAL         NOT NULL,
  "taskId"        INTEGER        NOT NULL,
  "staffMemberId" TEXT           NOT NULL,
  "createdAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule"
(
  "id"          SERIAL         NOT NULL,
  "shop"        TEXT           NOT NULL,
  "name"        TEXT           NOT NULL,
  "locationId"  TEXT,
  "publishedAt" TIMESTAMPTZ(3),
  "createdAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LongRunningTask_name_key" ON "LongRunningTask" ("name");

-- CreateIndex
CREATE INDEX "ScheduleEventAssignment_scheduleItemId_staffMemberId_idx" ON "ScheduleEventAssignment" ("scheduleItemId", "staffMemberId");

-- CreateIndex
CREATE INDEX "ScheduleEventAssignment_staffMemberId_idx" ON "ScheduleEventAssignment" ("staffMemberId");

-- CreateIndex
CREATE INDEX "EmployeeAvailability_shop_staffMemberId_available_start_end_idx" ON "EmployeeAvailability" (shop, "staffMemberId", "available", "start", "end");

-- CreateIndex
CREATE INDEX "EmployeeAvailability_shop_id_staffMemberId_idx" ON "EmployeeAvailability" ("shop", "id", "staffMemberId");

-- CreateIndex
CREATE INDEX "EmployeeAvailability_shop_available_start_end_idx" ON "EmployeeAvailability" (shop, "available", "start", "end");

-- CreateIndex
CREATE INDEX "EmployeeAvailability_shop_available_end_idx" ON "EmployeeAvailability" (shop, "available", "end");

-- CreateIndex
CREATE INDEX "ScheduleEvent_scheduleId_idx" ON "ScheduleEvent" ("scheduleId");

-- CreateIndex
CREATE INDEX "ScheduleEvent_start_end_idx" ON "ScheduleEvent" ("start", "end");

-- CreateIndex
CREATE INDEX "ScheduleEvent_end_idx" ON "ScheduleEvent" ("end");

-- CreateIndex
CREATE INDEX "TaskAssignment_taskId_idx" ON "TaskAssignment" ("taskId");

-- CreateIndex
CREATE INDEX "TaskAssignment_staffMemberId_idx" ON "TaskAssignment" ("staffMemberId");

-- CreateIndex
CREATE INDEX "Task_shop_idx" ON "Task" ("shop");

-- CreateIndex
CREATE INDEX "ScheduleEventTask_scheduleItemId_taskId_idx" ON "ScheduleEventTask" ("scheduleItemId", "taskId");

-- CreateIndex
CREATE INDEX "ScheduleEventTask_taskId_idx" ON "ScheduleEventTask" ("taskId");

-- CreateIndex
CREATE INDEX "Schedule_shop_id_idx" ON "Schedule" ("shop", "id");

-- CreateIndex
CREATE INDEX "Schedule_shop_locationId_idx" ON "Schedule" ("shop", "locationId");

-- CreateIndex
CREATE INDEX "Schedule_shop_publishedAt_idx" ON "Schedule" ("shop", "publishedAt");

-- AddForeignKey
ALTER TABLE "ScheduleEventAssignment"
  ADD CONSTRAINT "ScheduleEventAssignment_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES "ScheduleEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEvent"
  ADD CONSTRAINT "ScheduleEvent_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEventTask"
  ADD CONSTRAINT "ScheduleEventTask_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES "ScheduleEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEventTask"
  ADD CONSTRAINT "ScheduleEventTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskWorkOrderLink"
  ADD CONSTRAINT "TaskWorkOrderLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskWorkOrderLink"
  ADD CONSTRAINT "TaskWorkOrderLink_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPurchaseOrderLink"
  ADD CONSTRAINT "TaskPurchaseOrderLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPurchaseOrderLink"
  ADD CONSTRAINT "TaskPurchaseOrderLink_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSpecialOrderLink"
  ADD CONSTRAINT "TaskSpecialOrderLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSpecialOrderLink"
  ADD CONSTRAINT "TaskSpecialOrderLink_specialOrderId_fkey" FOREIGN KEY ("specialOrderId") REFERENCES "SpecialOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskStockTransferLink"
  ADD CONSTRAINT "TaskStockTransferLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskStockTransferLink"
  ADD CONSTRAINT "TaskStockTransferLink_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "StockTransfer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCycleCountLink"
  ADD CONSTRAINT "TaskCycleCountLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCycleCountLink"
  ADD CONSTRAINT "TaskCycleCountLink_cycleCountId_fkey" FOREIGN KEY ("cycleCountId") REFERENCES "CycleCount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSerialLink"
  ADD CONSTRAINT "TaskSerialLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSerialLink"
  ADD CONSTRAINT "TaskSerialLink_serialId_fkey" FOREIGN KEY ("serialId") REFERENCES "ProductVariantSerial" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment"
  ADD CONSTRAINT "TaskAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE TRIGGER "EmployeeAvailability_updatedAt"
  BEFORE UPDATE
  ON "EmployeeAvailability"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "ScheduleEvent_updatedAt"
  BEFORE UPDATE
  ON "ScheduleEvent"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "ScheduleEventTask_updatedAt"
  BEFORE UPDATE
  ON "ScheduleEventTask"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "TaskWorkOrderLink_updatedAt"
  BEFORE UPDATE
  ON "TaskWorkOrderLink"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "TaskPurchaseOrderLink_updatedAt"
  BEFORE UPDATE
  ON "TaskPurchaseOrderLink"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "TaskSpecialOrderLink_updatedAt"
  BEFORE UPDATE
  ON "TaskSpecialOrderLink"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "TaskStockTransferLink_updatedAt"
  BEFORE UPDATE
  ON "TaskStockTransferLink"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "TaskCycleCountLink_updatedAt"
  BEFORE UPDATE
  ON "TaskCycleCountLink"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "TaskSerialLink_updatedAt"
  BEFORE UPDATE
  ON "TaskSerialLink"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "TaskAssignment_updatedAt"
  BEFORE UPDATE
  ON "TaskAssignment"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "Schedule_updatedAt"
  BEFORE UPDATE
  ON "Schedule"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

CREATE TRIGGER "ScheduleEventAssignment_updatedAt"
  BEFORE UPDATE
  ON "ScheduleEventAssignment"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
