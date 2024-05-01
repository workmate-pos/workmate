/* @name getMany */
SELECT *
FROM "Employee"
WHERE "staffMemberId" = ANY(:employeeIds)
  AND shop = COALESCE(:shop, shop);

/* @name getPage */
SELECT *
FROM "Employee"
WHERE shop = COALESCE(:shop, shop)
  AND name ILIKE COALESCE(:query, '%');

/* @name upsert */
INSERT INTO "Employee" (shop, superuser, permissions, rate, name, "isShopOwner", "staffMemberId")
VALUES (:shop!, :superuser!, :permissions!, :rate, :name!, :isShopOwner!, :staffMemberId!)
ON CONFLICT ("staffMemberId")
  DO UPDATE
  SET shop          = EXCLUDED.shop,
      superuser     = EXCLUDED.superuser,
      permissions   = EXCLUDED.permissions,
      rate          = EXCLUDED.rate,
      name          = EXCLUDED.name,
      "isShopOwner" = EXCLUDED."isShopOwner"
RETURNING *;

/*
  @name upsertMany
  @param employees -> ((shop!, superuser!, permissions!, rate, name!, isShopOwner!, staffMemberId!)...)
*/
INSERT INTO "Employee" (shop, superuser, permissions, rate, name, "isShopOwner", "staffMemberId")
VALUES ('', FALSE, ARRAY[] :: "PermissionNode"[], '', '', FALSE, ''), :employees OFFSET 1
ON CONFLICT ("staffMemberId")
  DO UPDATE
  SET shop          = EXCLUDED.shop,
      superuser     = EXCLUDED.superuser,
      permissions   = EXCLUDED.permissions,
      rate          = EXCLUDED.rate,
      name          = EXCLUDED.name,
      "isShopOwner" = EXCLUDED."isShopOwner"
RETURNING *;

/*
    @name deleteMany
    @param employeeIds -> (...)
*/
DELETE
FROM "Employee"
WHERE "staffMemberId" IN :employeeIds!;

/* @name doesSuperuserExist */
SELECT EXISTS (
  SELECT 1
  FROM "Employee"
  WHERE shop = :shop!
    AND superuser = TRUE
) AS "exists";
