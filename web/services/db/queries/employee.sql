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
    @param employees -> ((employeeId!, superuser!, permissions!, rate, isShopOwner!, name!)...)
*/
WITH Input AS (
    SELECT "employeeId", :shop! AS shop, rate, superuser, permissions, "isShopOwner", name
    FROM (VALUES ('', FALSE, ARRAY[] :: "PermissionNode"[], '', FALSE, ''), :employees! OFFSET 1) AS t ("employeeId", superuser, permissions, rate, "isShopOwner", name)
)
INSERT INTO "Employee" ("employeeId", shop, superuser, permissions, rate, "isShopOwner", name)
SELECT "employeeId", shop, superuser, permissions, rate, "isShopOwner", name
FROM Input
ON CONFLICT ("employeeId", "shop")
DO UPDATE SET "rate" = EXCLUDED."rate",
              "superuser" = EXCLUDED."superuser",
              "permissions" = EXCLUDED."permissions",
              "isShopOwner" = EXCLUDED."isShopOwner",
              "name" = EXCLUDED."name"
RETURNING *;

/*
    @name deleteMany
    @param employeeIds -> (...)
*/
DELETE FROM "Employee"
WHERE shop = :shop!
AND "employeeId" IN :employeeIds!;
