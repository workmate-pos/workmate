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
  SET "productId"       = :productId!,
      "inventoryItemId" = :inventoryItemId!,
      sku               = :sku,
      title             = :title;

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