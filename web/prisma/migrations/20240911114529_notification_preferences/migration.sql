-- CreateTable
CREATE TABLE "CustomerNotificationPreference"
(
  "id"         SERIAL         NOT NULL,
  "customerId" TEXT           NOT NULL,
  "preference" TEXT           NOT NULL,
  "createdAt"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerNotificationPreference_customerId_key" ON "CustomerNotificationPreference" ("customerId");

-- CreateIndex
CREATE INDEX "Notification_shop_uuid_idx" ON "Notification" ("shop", "uuid");

-- CreateIndex
CREATE INDEX "Notification_externalId_idx" ON "Notification" ("externalId");

CREATE TRIGGER "CustomerNotificationPreference_updatedAt"
  BEFORE UPDATE
  ON "CustomerNotificationPreference"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
