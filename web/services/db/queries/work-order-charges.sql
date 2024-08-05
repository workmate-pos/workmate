/* @name upsertHourlyLabourCharge */
INSERT INTO "WorkOrderHourlyLabourCharge" ("workOrderId", "employeeId", name, rate, hours, "workOrderItemUuid",
                                           "workOrderCustomItemUuid",
                                           "shopifyOrderLineItemId", uuid, "rateLocked", "hoursLocked", "removeLocked")
VALUES (:workOrderId!, :employeeId, :name!, :rate!, :hours!, :workOrderItemUuid, :workOrderCustomItemUuid,
        :shopifyOrderLineItemId, :uuid!,
        :rateLocked!, :hoursLocked!, :removeLocked!)
ON CONFLICT ("workOrderId", uuid)
  DO UPDATE
  SET "employeeId"              = EXCLUDED."employeeId",
      name                      = EXCLUDED.name,
      rate                      = EXCLUDED.rate,
      hours                     = EXCLUDED.hours,
      "workOrderItemUuid"       = EXCLUDED."workOrderItemUuid",
      "workOrderCustomItemUuid" = EXCLUDED."workOrderCustomItemUuid",
      "shopifyOrderLineItemId"  = EXCLUDED."shopifyOrderLineItemId",
      "rateLocked"              = EXCLUDED."rateLocked",
      "hoursLocked"             = EXCLUDED."hoursLocked",
      "removeLocked"            = EXCLUDED."removeLocked";

/*
  @name upsertHourlyLabourCharges
  @param charges -> ((workOrderId!, employeeId, name!, rate!, hours!, workOrderItemUuid, workOrderCustomItemUuid, shopifyOrderLineItemId, uuid!, rateLocked!, hoursLocked!, removeLocked!)...)
*/
INSERT INTO "WorkOrderHourlyLabourCharge" ("workOrderId", "employeeId", name, rate, hours, "workOrderItemUuid",
                                           "workOrderCustomItemUuid",
                                           "shopifyOrderLineItemId", uuid, "rateLocked", "hoursLocked", "removeLocked")
VALUES (0, NULL, '', '', '', gen_random_uuid(), gen_random_uuid(), NULL, gen_random_uuid(), FALSE, FALSE, FALSE), :charges
OFFSET 1
ON CONFLICT ("workOrderId", uuid)
DO UPDATE
SET "employeeId" = EXCLUDED."employeeId",
      name                     = EXCLUDED.name,
      rate                     = EXCLUDED.rate,
      hours                    = EXCLUDED.hours,
      "workOrderItemUuid"      = EXCLUDED."workOrderItemUuid",
      "workOrderCustomItemUuid"      = EXCLUDED."workOrderCustomItemUuid",
      "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
      "rateLocked"             = EXCLUDED."rateLocked",
      "hoursLocked"            = EXCLUDED."hoursLocked",
      "removeLocked"           = EXCLUDED."removeLocked";

/* @name upsertFixedPriceLabourCharge */
INSERT INTO "WorkOrderFixedPriceLabourCharge" ("workOrderId", "employeeId", name, amount, "workOrderItemUuid",
                                               "workOrderCustomItemUuid",
                                               "shopifyOrderLineItemId", uuid, "amountLocked", "removeLocked")
VALUES (:workOrderId!, :employeeId, :name!, :amount!, :workOrderItemUuid, :workOrderCustomItemUuid,
        :shopifyOrderLineItemId, :uuid!,
        :amountLocked!, :removeLocked!)
ON CONFLICT ("workOrderId", uuid)
  DO UPDATE
  SET "employeeId"              = EXCLUDED."employeeId",
      name                      = EXCLUDED.name,
      amount                    = EXCLUDED.amount,
      "workOrderItemUuid"       = EXCLUDED."workOrderItemUuid",
      "workOrderCustomItemUuid" = EXCLUDED."workOrderCustomItemUuid",
      "shopifyOrderLineItemId"  = EXCLUDED."shopifyOrderLineItemId",
      "amountLocked"            = EXCLUDED."amountLocked",
      "removeLocked"            = EXCLUDED."removeLocked";

/*
  @name upsertFixedPriceLabourCharges
  @param charges -> ((workOrderId!, employeeId, name!, amount!, workOrderItemUuid, workOrderCustomItemUuid, shopifyOrderLineItemId, uuid!, amountLocked!, removeLocked!)...)
*/
INSERT INTO "WorkOrderFixedPriceLabourCharge" ("workOrderId", "employeeId", name, amount, "workOrderItemUuid",
                                               "workOrderCustomItemUuid",
                                               "shopifyOrderLineItemId", uuid, "amountLocked", "removeLocked")
VALUES (0, NULL, '', '', gen_random_uuid(), gen_random_uuid(), NULL, gen_random_uuid(), FALSE, FALSE), :charges
OFFSET 1
ON CONFLICT ("workOrderId", uuid)
DO UPDATE
SET "employeeId" = EXCLUDED."employeeId",
      name                     = EXCLUDED.name,
     amount                   = EXCLUDED.amount,
      "workOrderItemUuid"      = EXCLUDED."workOrderItemUuid",
      "workOrderCustomItemUuid"      = EXCLUDED."workOrderCustomItemUuid",
      "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
      "amountLocked"           = EXCLUDED."amountLocked",
      "removeLocked"           = EXCLUDED."removeLocked";

/* @name removeHourlyLabourCharge */
DELETE
FROM "WorkOrderHourlyLabourCharge" hl
WHERE hl."workOrderId" = :workOrderId!
  AND hl.uuid = :uuid!;

/* @name removeFixedPriceLabourCharge */
DELETE
FROM "WorkOrderFixedPriceLabourCharge" fpl
WHERE fpl."workOrderId" = :workOrderId!
  AND fpl.uuid = :uuid!;

/* @name getHourlyLabourCharges */
SELECT *
FROM "WorkOrderHourlyLabourCharge"
WHERE "workOrderId" = :workOrderId!;

/* @name getFixedPriceLabourCharges */
SELECT *
FROM "WorkOrderFixedPriceLabourCharge"
WHERE "workOrderId" = :workOrderId!;

/*
  @name getHourlyLabourChargesByUuids
  @param uuids -> (...)
*/
SELECT *
FROM "WorkOrderHourlyLabourCharge"
WHERE uuid IN :uuids!
  AND "workOrderId" = :workOrderId!;

/*
  @name getFixedPriceLabourChargesByUuids
  @param uuids -> (...)
*/
SELECT *
FROM "WorkOrderFixedPriceLabourCharge"
WHERE uuid IN :uuids!
  AND "workOrderId" = :workOrderId!;

/* @name setHourlyLabourChargeShopifyOrderLineItemId */
UPDATE "WorkOrderHourlyLabourCharge"
SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
WHERE uuid = :uuid!
  AND "workOrderId" = :workOrderId!;

/* @name setFixedPriceLabourChargeShopifyOrderLineItemId */
UPDATE "WorkOrderFixedPriceLabourCharge"
SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
WHERE uuid = :uuid!
  AND "workOrderId" = :workOrderId!;
