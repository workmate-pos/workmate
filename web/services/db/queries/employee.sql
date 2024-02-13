/*
    @name getMany
    @param employeeIds -> (...)
*/
SELECT *
FROM "Employee"
WHERE shop = :shop!
AND "employeeId" IN :employeeIds!;

/*
    @name upsertMany
    @param employees -> ((employeeId!, superuser!, permissions!, rate)...)
*/
WITH Input AS (
    SELECT "employeeId", :shop! AS shop, rate, superuser, permissions
    FROM (VALUES ('', FALSE, ARRAY[] :: "PermissionNode"[], ''), :employees! OFFSET 1) AS t ("employeeId", superuser, permissions, rate)
)
INSERT INTO "Employee" ("employeeId", shop, superuser, permissions, rate)
SELECT "employeeId", shop, superuser, permissions, rate
FROM Input
ON CONFLICT ("employeeId", "shop")
DO UPDATE SET "rate" = EXCLUDED."rate",
              "superuser" = EXCLUDED."superuser",
              "permissions" = EXCLUDED."permissions"
RETURNING *;

/*
    @name deleteMany
    @param employeeIds -> (...)
*/
DELETE FROM "Employee"
WHERE shop = :shop!
AND "employeeId" IN :employeeIds!;
