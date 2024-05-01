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
INSERT INTO "Customer" ("customerId", shop, "displayName", "firstName", "lastName", email, phone, address)
VALUES (:customerId!, :shop!, :displayName!, :firstName, :lastName, :email, :phone, :address)
ON CONFLICT ("customerId") DO UPDATE
  SET shop          = EXCLUDED.shop,
      "displayName" = EXCLUDED."displayName",
      "firstName"   = EXCLUDED."firstName",
      "lastName"    = EXCLUDED."lastName",
      email         = EXCLUDED.email,
      phone         = EXCLUDED.phone,
      address       = EXCLUDED.address;

/*
  @name upsertMany
  @param customers -> ((customerId!, shop!, displayName!, firstName, lastName, email, phone, address)...)
*/
INSERT INTO "Customer" ("customerId", shop, "displayName", "firstName", "lastName", email, phone, address)
VALUES ('', '', '', '', '', '', '', ''), :customers OFFSET 1
ON CONFLICT ("customerId") DO UPDATE
  SET shop          = EXCLUDED.shop,
      "displayName" = EXCLUDED."displayName",
      "firstName"   = EXCLUDED."firstName",
      "lastName"    = EXCLUDED."lastName",
      email         = EXCLUDED.email,
      phone         = EXCLUDED.phone,
      address       = EXCLUDED.address;

/*
  @name softDeleteCustomers
  @param customerIds -> (...)
*/
UPDATE "Customer"
SET "deletedAt" = NOW()
WHERE "customerId" IN :customerIds!
AND "deletedAt" IS NULL;
