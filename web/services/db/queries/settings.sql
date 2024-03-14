/* @name upsertSetting */
INSERT INTO "Settings" (shop, key, value)
VALUES (:shop!, :key!, :value!)
ON CONFLICT (shop, key) DO UPDATE SET value = :value!
RETURNING *;

/* @name get */
SELECT key, value
FROM "Settings"
WHERE shop = :shop!;

/* @name insertSettingIfNotExists */
INSERT INTO "Settings" (shop, key, value)
SELECT :shop!, :key!, :value!
ON CONFLICT DO NOTHING
RETURNING *;

/*
  @name insertSettingsIfNotExists
  @param settings -> ((shop!, key!, value!)...)
*/
INSERT INTO "Settings" (shop, key, value)
VALUES :settings!
ON CONFLICT DO NOTHING
RETURNING *;
