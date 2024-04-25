/* @name getAll */
SELECT *
FROM "WorkOrder";

/* @name getHourlyLabours */
SELECT *
FROM "HourlyLabour"
WHERE "workOrderId" = :workOrderId!;

/* @name getFixedPriceLabours */
SELECT *
FROM "FixedPriceLabour"
WHERE "workOrderId" = :workOrderId!;

/* @name removeWorkOrder */
DELETE
FROM "WorkOrder"
WHERE id = :workOrderId!;

/* @name removeHourlyLabour */
DELETE
FROM "HourlyLabour"
WHERE "workOrderId" = :workOrderId!;

/* @name removeFixedPriceLabour */
DELETE
FROM "FixedPriceLabour"
WHERE "workOrderId" = :workOrderId!;
