-- CreateTable
CREATE TABLE "ShopifyObject"
(
  "id"        SERIAL         NOT NULL,
  "shop"      TEXT           NOT NULL,
  "key"       TEXT           NOT NULL,
  "data"      JSONB          NOT NULL,
  "stale"     BOOL           NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "ShopifyObject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyObject_shop_key_key" ON "ShopifyObject" ("shop", "key");

CREATE TRIGGER "ShopifyObject_updatedAt"
  BEFORE UPDATE
  ON "ShopifyObject"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
