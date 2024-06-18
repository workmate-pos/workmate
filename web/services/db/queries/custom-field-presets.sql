/* @name getCustomFieldsPresets */
SELECT *
FROM "CustomFieldsPreset"
WHERE shop = :shop!
  AND type = COALESCE(:type, type);

/* @name getCustomFieldsPreset */
SELECT *
FROM "CustomFieldsPreset"
WHERE shop = :shop!
  AND type = :type!
  AND name = :name!;

/* @name upsertCustomFieldsPreset */
INSERT INTO "CustomFieldsPreset" (shop, name, type, keys, "default")
VALUES (:shop!, :name!, :type!, :keys!, :default!)
ON CONFLICT (shop, type, name) DO UPDATE
  SET keys      = EXCLUDED.keys,
      "default" = EXCLUDED.default;

/* @name removeCustomFieldsPreset */
DELETE
FROM "CustomFieldsPreset"
WHERE shop = :shop!
  AND type = :type!
  AND name = :name!;
