-- CreateTable
CREATE TABLE "SpecialOrderNotification"
(
  "id"               SERIAL         NOT NULL,
  "specialOrderId"   INTEGER        NOT NULL,
  "notificationUuid" UUID           NOT NULL,
  "createdAt"        TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SpecialOrderNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpecialOrderNotification_specialOrderId_notificationUuid_key" ON "SpecialOrderNotification" ("specialOrderId", "notificationUuid");

-- AddForeignKey
ALTER TABLE "SpecialOrderNotification"
  ADD CONSTRAINT "SpecialOrderNotification_specialOrderId_fkey" FOREIGN KEY ("specialOrderId") REFERENCES "SpecialOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialOrderNotification"
  ADD CONSTRAINT "SpecialOrderNotification_notificationUuid_fkey" FOREIGN KEY ("notificationUuid") REFERENCES "Notification" ("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "SpecialOrderNotification_updatedAt"
  BEFORE UPDATE
  ON "SpecialOrderNotification"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

