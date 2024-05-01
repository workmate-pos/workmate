/*
  @name remove
  @param ids -> (...)
*/
DELETE
FROM "ShopifySession"
WHERE id IN :ids!
RETURNING *;

/* @name removeByShop */
DELETE
FROM "ShopifySession"
WHERE shop = :shop!;

/* @name get */
SELECT *
FROM "ShopifySession"
WHERE id = COALESCE(:id, id)
  AND shop = COALESCE(:shop, shop)
  AND "isOnline" = COALESCE(:isOnline, "isOnline")
LIMIT :limit;

/* @name upsert */
INSERT INTO "ShopifySession" (id, shop, state, "isOnline", scope, expires, "onlineAccessInfo", "accessToken")
VALUES (:id!, :shop!, :state!, :isOnline!, :scope, :expires, :onlineAccessInfo, :accessToken)
ON CONFLICT (id) DO UPDATE SET shop               = EXCLUDED.shop,
                               state              = EXCLUDED.state,
                               "isOnline"         = EXCLUDED."isOnline",
                               scope              = EXCLUDED.scope,
                               expires            = EXCLUDED.expires,
                               "onlineAccessInfo" = EXCLUDED."onlineAccessInfo",
                               "accessToken"      = EXCLUDED."accessToken"
RETURNING *;

/* @name getOnlineAccessInfoByShop */
SELECT "onlineAccessInfo"
FROM "ShopifySession"
WHERE shop = :shop!
  AND "isOnline" = true;
