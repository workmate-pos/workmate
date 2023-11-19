/* @name get */
SELECT *
FROM "ShopifyStoreProperties"
WHERE shop = :shop!;

/* @name upsert */
INSERT INTO "ShopifyStoreProperties" (shop, name, "currencyCode", "currencyFormat")
VALUES (:shop!, :name!, :currencyCode!, :currencyFormat!)
ON CONFLICT (shop) DO UPDATE SET
  name = :name!,
  "currencyCode" = :currencyCode!,
  "currencyFormat" = :currencyFormat!
RETURNING *;
