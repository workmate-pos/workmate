/* @name get */
SELECT *
FROM "Customer"
WHERE "customerId" = :customerId!;

/*
  @name getMany
  @param customerIds -> (...)
*/
SELECT *
FROM "Customer"
WHERE "customerId" IN :customerIds!;

/* @name upsert */
INSERT INTO "Customer" ("customerId", shop, "displayName", "firstName", "lastName", email, phone)
VALUES (:customerId!, :shop!, :displayName!, :firstName, :lastName, :email, :phone)
ON CONFLICT ("customerId") DO UPDATE
  SET shop          = :shop!,
      "displayName" = :displayName!,
      "firstName"   = :firstName,
      "lastName"    = :lastName,
      email         = :email,
      phone         = :phone;

/*
  @name softDeleteCustomers
  @param customerIds -> (...)
*/
UPDATE "Customer"
SET "deletedAt" = NOW()
WHERE "customerId" IN :customerIds!
AND "deletedAt" IS NULL;
