-- CreateTable
CREATE TABLE "CycleCountEmployeeAssignment" (
    "id" SERIAL NOT NULL,
    "cycleCountId" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleCountEmployeeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CycleCountEmployeeAssignment_cycleCountId_employeeId_key" ON "CycleCountEmployeeAssignment"("cycleCountId", "employeeId");

-- AddForeignKey
ALTER TABLE "CycleCountEmployeeAssignment" ADD CONSTRAINT "CycleCountEmployeeAssignment_cycleCountId_fkey" FOREIGN KEY ("cycleCountId") REFERENCES "CycleCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "CycleCountEmployeeAssignment_updatedAt"
    BEFORE UPDATE ON "CycleCountEmployeeAssignment"
    FOR EACH ROW
EXECUTE PROCEDURE updated_at();
