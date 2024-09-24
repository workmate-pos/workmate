-- CreateTable
CREATE TABLE "Task"
(
  "id"          SERIAL         NOT NULL,
  "name"        TEXT           NOT NULL,
  "progress"    INTEGER        NOT NULL,
  "progressMax" INTEGER,
  "createdAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_name_key" ON "Task" ("name");

CREATE TRIGGER "Task_updatedAt"
  BEFORE UPDATE
  ON "Task"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
