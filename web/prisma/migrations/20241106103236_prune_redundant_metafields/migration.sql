-- Delete all metafields that are not in the scanner settings
DELETE
FROM "Metafield"
WHERE id = ANY (SELECT m.id
                FROM "Metafield" m
                       INNER JOIN "Settings" s ON s.shop = m.shop AND s.key = 'settings'
                WHERE (m."objectId" ILIKE 'gid://shopify/Product/%' AND
                       NOT ((s.value :: jsonb) -> 'scanner' -> 'variants' -> 'metafields' -> 'product' ?
                            (m.namespace || '.' || m.key)))
                   OR (m."objectId" ILIKE 'gid://shopify/ProductVariant/%' AND
                       NOT ((s.value :: jsonb) -> 'scanner' -> 'variants' -> 'metafields' -> 'variant' ?
                            (m.namespace || '.' || m.key))));

