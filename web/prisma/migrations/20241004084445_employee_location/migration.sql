-- DropIndex
DROP INDEX "Employee_shop_idx";

-- CreateTable
CREATE TABLE "EmployeeLocation"
(
  "id"            SERIAL         NOT NULL,
  "staffMemberId" TEXT           NOT NULL,
  "locationId"    TEXT           NOT NULL,
  "createdAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmployeeLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeLocation_staffMemberId_idx" ON "EmployeeLocation" ("staffMemberId");

-- CreateIndex
CREATE INDEX "EmployeeLocation_locationId_idx" ON "EmployeeLocation" ("locationId");

-- CreateIndex
CREATE INDEX "Employee_shop_staffMemberId_idx" ON "Employee" ("shop", "staffMemberId");

-- AddForeignKey
ALTER TABLE "EmployeeLocation"
  ADD CONSTRAINT "EmployeeLocation_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "Employee" ("staffMemberId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "EmployeeLocation_updatedAt"
  BEFORE UPDATE
  ON "EmployeeLocation"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
