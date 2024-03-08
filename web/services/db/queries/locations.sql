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
  SET shop = :shop!,
      name = :name!;

/*
  @name softDeleteLocations
  @param locationIds -> (...)
*/
UPDATE "Location"
SET "deletedAt" = NOW()
WHERE "locationId" IN :locationIds!
AND "deletedAt" IS NULL;
