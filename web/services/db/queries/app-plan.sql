/* @name getSubscription */
SELECT aps.*,
       ap.name AS "appPlanName",
       ap.interval AS "appPlanInterval",
       apst."createdAt" AS "appPlanTrialCreatedAt"
FROM "AppPlanSubscription" aps
       JOIN "AppPlan" ap on ap.id = aps."appPlanId"
       JOIN "AppPlanSubscriptionTrials" apst on apst.shop = aps.shop
WHERE aps.shop = :shop!;

/* @name upsertSubscription */
WITH insertedSubscriptionTrial AS (
  INSERT INTO "AppPlanSubscriptionTrials" (shop)
    VALUES (:shop!)
    ON CONFLICT (shop) DO NOTHING
    RETURNING *
)
INSERT INTO "AppPlanSubscription" ("appSubscriptionShopifyId", shop, "appSubscriptionStatus", "appPlanId")
VALUES (:appSubscriptionShopifyId!, :shop!, :appSubscriptionStatus!, :appPlanId!)
ON CONFLICT ("shop") DO UPDATE SET
                                 "appSubscriptionShopifyId" = EXCLUDED."appSubscriptionShopifyId",
                                 "appSubscriptionStatus" = EXCLUDED."appSubscriptionStatus",
                                 "appPlanId" = EXCLUDED."appPlanId"
RETURNING *;

/* @name get */
SELECT ap.*,
       apca.type AS "accessType"
       FROM "AppPlan" ap
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
