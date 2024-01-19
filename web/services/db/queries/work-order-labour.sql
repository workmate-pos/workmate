/* @name insertHourlyLabour */
INSERT INTO "HourlyLabour" ("workOrderId", "lineItemUuid", "productVariantId", "employeeId", name, rate, hours)
VALUES (:workOrderId!, :lineItemUuid, :productVariantId, :employeeId, :name!, :rate!, :hours);

/* @name insertFixedPriceLabour */
INSERT INTO "FixedPriceLabour" ("workOrderId", "lineItemUuid", "productVariantId", "employeeId", name, amount)
VALUES (:workOrderId!, :lineItemUuid, :productVariantId, :employeeId, :name!, :amount!);

/* @name removeHourlyLabour */
DELETE FROM "HourlyLabour" hl
WHERE hl."workOrderId" = :workOrderId!;

/* @name removeFixedPriceLabour */
DELETE FROM "FixedPriceLabour" fpl
WHERE fpl."workOrderId" = :workOrderId!;
