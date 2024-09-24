-- CreateTable
CREATE TABLE "Metafield"
(
  "id"          SERIAL         NOT NULL,
  "shop"        TEXT           NOT NULL,
  "objectId"    TEXT           NOT NULL,
  "metafieldId" TEXT           NOT NULL,
  "namespace"   TEXT           NOT NULL,
  "key"         TEXT           NOT NULL,
  "value"       TEXT           NOT NULL,
  "createdAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Metafield_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Metafield_shop_namespace_key_value_idx" ON "Metafield" ("shop", "namespace", "key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Metafield_objectId_namespace_key_key" ON "Metafield" ("objectId", "namespace", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Metafield_metafieldId_key" ON "Metafield" ("metafieldId");

CREATE TRIGGER "Metafield_updatedAt"
  BEFORE UPDATE
  ON "Metafield"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
