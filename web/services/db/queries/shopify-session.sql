/*
  @name remove
  @param ids -> (...)
*/
DELETE
FROM "ShopifySession"
WHERE id IN :ids!
RETURNING *;

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
ON CONFLICT (id) DO UPDATE SET shop               = :shop!,
                               state              = :state!,
                               "isOnline"         = :isOnline!,
                               scope              = :scope,
                               expires            = :expires,
                               "onlineAccessInfo" = :onlineAccessInfo,
                               "accessToken"      = :accessToken
RETURNING *;
