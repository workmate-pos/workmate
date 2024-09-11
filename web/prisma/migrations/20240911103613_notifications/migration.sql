-- CreateTable
CREATE TABLE "Notification"
(
  "uuid"       UUID           NOT NULL,
  "shop"       TEXT           NOT NULL,
  "type"       TEXT           NOT NULL,
  "recipient"  TEXT           NOT NULL,
  "message"    TEXT           NOT NULL,
  "failed"     BOOLEAN        NOT NULL,
  "externalId" TEXT,
  "createdAt"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("uuid")
);

CREATE TRIGGER "Notification_updatedAt"
  BEFORE UPDATE
  ON "Notification"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();

