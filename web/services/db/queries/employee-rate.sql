/*
    @name getMany
    @param employeeIds -> (...)
*/
SELECT *
FROM "EmployeeRate"
WHERE shop = :shop!
AND "employeeId" IN :employeeIds!;

/*
    @name upsertMany
    @param rates -> ((employeeId!, rate!)...)
*/
WITH Input AS (
    SELECT "employeeId", :shop! AS shop, rate
    FROM (VALUES ('', 0), :rates! OFFSET 1) AS t ("employeeId", rate)
)
INSERT INTO "EmployeeRate" ("employeeId", "shop", "rate")
SELECT "employeeId", shop, rate
FROM Input
ON CONFLICT ("employeeId", "shop")
DO UPDATE SET "rate" = EXCLUDED."rate";

/*
    @name deleteMany
    @param employeeIds -> (...)
*/
DELETE FROM "EmployeeRate"
WHERE shop = :shop!
AND "employeeId" IN :employeeIds!;
