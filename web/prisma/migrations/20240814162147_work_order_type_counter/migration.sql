-- CreateTable
CREATE TABLE "WorkOrderTypeCounter"
(
  "id"         SERIAL  NOT NULL,
  "shop"       TEXT    NOT NULL,
  "type"       TEXT    NOT NULL,
  "last_value" INTEGER NOT NULL,

  CONSTRAINT "WorkOrderTypeCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderTypeCounter_shop_type_key" ON "WorkOrderTypeCounter" ("shop", "type");

-- Migrate idFormat and add other defaults for other shops
INSERT INTO "Settings" (shop, key, value)
SELECT shop,
       'workOrderTypes',
       json_build_object(
          'WORK_ORDER', json_build_object('idFormat', s.value :: json),
          'WARRANTY', json_build_object('idFormat', 'W-#{{id}}'),
          'SALE', json_build_object('idFormat', 'S-#{{id}}'),
          'BACK_ORDER', json_build_object('idFormat', 'BO-#{{id}}'),
          'LAYAWAY', json_build_object('idFormat', 'LA-#{{id}}')
       ) :: text
FROM "Settings" s
WHERE key = 'idFormat';
