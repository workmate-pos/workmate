/* @name insertHourlyLabourCharge */
INSERT INTO "HourlyLabourCharge" ("workOrderId", "employeeId", name, rate, hours, "workOrderItemUuid",
                                  "shopifyOrderLineItemId", uuid)
VALUES (:workOrderId!, :employeeId, :name!, :rate!, :hours!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!);

/* @name insertFixedPriceLabourCharge */
INSERT INTO "FixedPriceLabourCharge" ("workOrderId", "employeeId", name, amount, "workOrderItemUuid",
                                      "shopifyOrderLineItemId", uuid)
VALUES (:workOrderId!, :employeeId, :name!, :amount!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!);

/* @name removeHourlyLabourCharge */
DELETE
FROM "HourlyLabourCharge" hl
WHERE hl."workOrderId" = :workOrderId!;

/* @name removeFixedPriceLabourCharge */
DELETE
FROM "FixedPriceLabourCharge" fpl
WHERE fpl."workOrderId" = :workOrderId!;

/* @name getHourlyLabourCharges */
SELECT *
FROM "HourlyLabourCharge"
WHERE "workOrderId" = :workOrderId!;

/* @name getFixedPriceLabourCharges */
SELECT *
FROM "FixedPriceLabourCharge"
WHERE "workOrderId" = :workOrderId!;

/*
  @name getHourlyLabourChargesByUuids
  @param uuids -> (...)
*/
SELECT *
FROM "HourlyLabourCharge"
WHERE uuid IN :uuids!
  AND "workOrderId" = :workOrderId!;

/*
  @name getFixedPriceLabourChargesByUuids
  @param uuids -> (...)
*/
SELECT *
FROM "FixedPriceLabourCharge"
WHERE uuid IN :uuids!
  AND "workOrderId" = :workOrderId!;

/* @name setHourlyLabourChargeShopifyOrderLineItemId */
UPDATE "HourlyLabourCharge"
SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
WHERE uuid = :uuid!
  AND "workOrderId" = :workOrderId!;

/* @name setFixedPriceLabourChargeShopifyOrderLineItemId */
UPDATE "FixedPriceLabourCharge"
SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
WHERE uuid = :uuid!
  AND "workOrderId" = :workOrderId!;
