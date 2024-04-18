/* @name get */
SELECT *
FROM "Product"
WHERE "productId" = :productId!;

/*
  @name getMany
  @param productIds -> (...)
*/
SELECT "Product".*, COALESCE(COUNT("ProductVariant"."productId"), 0) :: INTEGER AS "productVariantCount!"
FROM "Product"
LEFT JOIN "ProductVariant" ON "ProductVariant"."productId" = "Product"."productId"
WHERE "Product"."productId" IN :productIds!
GROUP BY "Product"."productId";

/* @name upsert */
INSERT INTO "Product" ("productId", handle, title, shop, description, "productType")
VALUES (:productId!, :handle!, :title!, :shop!, :description!, :productType!)
ON CONFLICT ("productId") DO UPDATE
  SET handle = :handle!,
      title  = :title!,
      shop   = :shop!,
      description = :description!,
      "productType" = :productType!;

/*
  @name softDeleteProducts
  @param productIds -> (...)
*/
UPDATE "Product"
SET "deletedAt" = NOW()
WHERE "productId" IN :productIds!
AND "deletedAt" IS NULL;
