/*
    @name getMany
    @param employeeIds -> (...)
*/
SELECT *
FROM "Employee"
WHERE "staffMemberId" IN :employeeIds!;

/* @name upsert */
INSERT INTO "Employee" (shop, superuser, permissions, rate, name, "isShopOwner", "staffMemberId")
VALUES (:shop!, :superuser!, :permissions!, :rate, :name!, :isShopOwner!, :staffMemberId!)
ON CONFLICT ("staffMemberId")
  DO UPDATE
  SET shop          = :shop!,
      superuser     = :superuser!,
      permissions   = :permissions!,
      rate          = :rate,
      name          = :name!,
      "isShopOwner" = :isShopOwner!;

/*
    @name deleteMany
    @param employeeIds -> (...)
*/
DELETE
FROM "Employee"
WHERE "staffMemberId" IN :employeeIds!;

/* @name doEmployeesExist */
SELECT EXISTS (
  SELECT 1
  FROM "Employee"
) AS "exists";
