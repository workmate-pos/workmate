/* @name upsertHourlyLabourCharge */
INSERT INTO "WorkOrderHourlyLabourCharge" ("workOrderId", "employeeId", name, rate, hours, "workOrderItemUuid",
                                  "shopifyOrderLineItemId", uuid)
VALUES (:workOrderId!, :employeeId, :name!, :rate!, :hours!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!)
ON CONFLICT ("workOrderId", uuid)
  DO UPDATE
  SET "employeeId"             = :employeeId,
      name                     = :name!,
      rate                     = :rate!,
      hours                    = :hours!,
      "workOrderItemUuid"      = :workOrderItemUuid,
      "shopifyOrderLineItemId" = :shopifyOrderLineItemId;

/* @name upsertFixedPriceLabourCharge */
INSERT INTO "WorkOrderFixedPriceLabourCharge" ("workOrderId", "employeeId", name, amount, "workOrderItemUuid",
                                      "shopifyOrderLineItemId", uuid)
VALUES (:workOrderId!, :employeeId, :name!, :amount!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!)
ON CONFLICT ("workOrderId", uuid)
  DO UPDATE
  SET "employeeId"             = :employeeId,
      name                     = :name!,
      amount                   = :amount!,
      "workOrderItemUuid"      = :workOrderItemUuid,
      "shopifyOrderLineItemId" = :shopifyOrderLineItemId;

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
