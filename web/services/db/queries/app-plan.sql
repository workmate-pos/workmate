/* @name getSubscription */
SELECT aps.*, ap.name AS "appPlanName" FROM "AppPlanSubscription" aps
                                              JOIN "AppPlan" ap on ap.id = aps."appPlanId"
WHERE aps.shop = :shop!;

/* @name upsertSubscription */
INSERT INTO "AppPlanSubscription" ("appSubscriptionShopifyId", shop, "appSubscriptionStatus", "appPlanId")
VALUES (:appSubscriptionShopifyId!, :shop!, :appSubscriptionStatus!, :appPlanId!)
ON CONFLICT ("shop") DO UPDATE SET
                                 "appSubscriptionShopifyId" = :appSubscriptionShopifyId!,
                                 "appSubscriptionStatus" = :appSubscriptionStatus!,
                                 "appPlanId" = :appPlanId!
RETURNING *;

/* @name get */
SELECT ap.* FROM "AppPlan" ap
                   LEFT JOIN "AppPlanCustomAccess" apca on ap.id = apca."appPlanId"
WHERE (ap.type = 'DEFAULT' OR (ap.type = 'CUSTOM' AND apca.shop = :shop!))
  AND ap.id = COALESCE(:id, ap.id);

/* @name removeByShop */
WITH deletedSubscription AS (
  DELETE FROM "AppPlanSubscription" aps
    WHERE aps.shop = :shop!
    RETURNING *
)
DELETE FROM "AppPlanCustomAccess" ap
WHERE ap.shop = :shop!;
