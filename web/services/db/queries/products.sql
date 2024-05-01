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
  SET handle = EXCLUDED.handle,
      title  = EXCLUDED.title,
      shop   = EXCLUDED.shop,
      description = EXCLUDED.description,
      "productType" = EXCLUDED."productType";

/*
  @name upsertMany
  @param products -> ((productId!, handle!, title!, shop!, description!, productType!)...)
*/
INSERT INTO "Product" ("productId", handle, title, shop, description, "productType")
VALUES ('', '', '', '', '', ''), :products OFFSET 1
ON CONFLICT ("productId") DO UPDATE
  SET handle = EXCLUDED.handle,
      title  = EXCLUDED.title,
      shop   = EXCLUDED.shop,
      description = EXCLUDED.description,
      "productType" = EXCLUDED."productType";

/*
  @name softDeleteProducts
  @param productIds -> (...)
*/
UPDATE "Product"
SET "deletedAt" = NOW()
WHERE "productId" IN :productIds!
AND "deletedAt" IS NULL;
