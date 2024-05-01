/* @name get */
SELECT *
FROM "Location"
WHERE "locationId" = :locationId!;

/*
  @name getMany
  @param locationIds -> (...)
*/
SELECT *
FROM "Location"
WHERE "locationId" IN :locationIds!;

/* @name upsert */
INSERT INTO "Location" ("locationId", shop, name)
VALUES (:locationId!, :shop!, :name!)
ON CONFLICT ("locationId")
  DO UPDATE
  SET shop = EXCLUDED.shop,
      name = EXCLUDED.name;

/*
  @name upsertMany
  @param locations -> ((locationId!, shop!, name!)...)
*/
INSERT INTO "Location" ("locationId", shop, name)
VALUES ('', '', ''), :locations OFFSET 1
ON CONFLICT ("locationId")
  DO UPDATE
  SET shop = EXCLUDED.shop,
      name = EXCLUDED.name;

/*
  @name softDeleteLocations
  @param locationIds -> (...)
*/
UPDATE "Location"
SET "deletedAt" = NOW()
WHERE "locationId" IN :locationIds!
AND "deletedAt" IS NULL;
