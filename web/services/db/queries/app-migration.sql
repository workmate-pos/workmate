/* @name insert */
INSERT INTO "AppMigration" (name, checksum, status)
VALUES (:name!, :checksum!, :status!)
RETURNING *;

/* @name updateStatus */
UPDATE "AppMigration"
SET status = :status!
WHERE name = :name!
RETURNING *;

/* @name getAll */
SELECT *
FROM "AppMigration";
