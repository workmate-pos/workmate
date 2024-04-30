/* @name get */
SELECT *
FROM "ProductVariant"
WHERE "productVariantId" = :productVariantId!;

/*
  @name getMany
  @param productVariantIds -> (...)
*/
SELECT *
FROM "ProductVariant"
WHERE "productVariantId" IN :productVariantIds!;

/* @name upsert */
INSERT INTO "ProductVariant" ("productVariantId", "productId", "inventoryItemId", sku, title)
VALUES (:productVariantId!, :productId!, :inventoryItemId!, :sku, :title)
ON CONFLICT ("productVariantId")
  DO UPDATE
  SET "productId"       = EXCLUDED."productId",
      "inventoryItemId" = EXCLUDED."inventoryItemId",
      sku               = EXCLUDED.sku,
      title             = EXCLUDED.title;

/*
  @name upsertMany
  @param productVariants -> ((productVariantId!, productId!, inventoryItemId!, sku, title)...)
*/
INSERT INTO "ProductVariant" ("productVariantId", "productId", "inventoryItemId", sku, title)
VALUES ('', '', '', '', ''), :productVariants OFFSET 1
ON CONFLICT ("productVariantId")
  DO UPDATE
  SET "productId"       = EXCLUDED."productId",
      "inventoryItemId" = EXCLUDED."inventoryItemId",
      sku               = EXCLUDED.sku,
      title             = EXCLUDED.title;

/*
  @name softDeleteProductVariants
  @param productVariantIds -> (...)
*/
UPDATE "ProductVariant"
SET "deletedAt" = NOW()
WHERE "productVariantId" IN :productVariantIds!
AND "deletedAt" IS NULL;

/* @name softDeleteProductVariantsByProductId */
UPDATE "ProductVariant"
SET "deletedAt" = NOW()
WHERE "productId" = :productId!
AND "deletedAt" IS NULL;
