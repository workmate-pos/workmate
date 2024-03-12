/* @name getCustomFieldsPresets */
SELECT *
FROM "CustomFieldsPreset"
WHERE shop = :shop!
  AND type = COALESCE(:type, type);

/* @name upsertCustomFieldsPreset */
INSERT INTO "CustomFieldsPreset" (shop, name, type, keys)
VALUES (:shop!, :name!, :type!, :keys!)
ON CONFLICT (shop, type, name) DO UPDATE
  SET keys = :keys!;

/* @name removeCustomFieldsPreset */
DELETE
FROM "CustomFieldsPreset"
WHERE shop = :shop!
  AND type = :type!
  AND name = :name!;
