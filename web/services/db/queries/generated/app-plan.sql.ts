/** Types generated for queries found in "services/db/queries/app-plan.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type AppPlanInterval = 'ANNUAL' | 'EVERY_30_DAYS';

export type AppPlanName = 'BASIC' | 'ENTERPRISE' | 'PREMIUM' | 'STARTER';

export type AppPlanType = 'CUSTOM' | 'DEFAULT';

/** 'GetSubscription' parameters type */
export interface IGetSubscriptionParams {
  shop: string;
}

/** 'GetSubscription' return type */
export interface IGetSubscriptionResult {
  appPlanId: number;
  appPlanInterval: AppPlanInterval;
  appPlanName: AppPlanName;
  appPlanTrialCreatedAt: Date;
  appSubscriptionShopifyId: string;
  appSubscriptionStatus: string;
  shop: string;
  updatedAt: Date;
}

/** 'GetSubscription' query type */
export interface IGetSubscriptionQuery {
  params: IGetSubscriptionParams;
  result: IGetSubscriptionResult;
}

const getSubscriptionIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":308,"b":313}]}],"statement":"SELECT aps.*,\n       ap.name AS \"appPlanName\",\n       ap.interval AS \"appPlanInterval\",\n       apst.\"createdAt\" AS \"appPlanTrialCreatedAt\"\nFROM \"AppPlanSubscription\" aps\n       JOIN \"AppPlan\" ap on ap.id = aps.\"appPlanId\"\n       JOIN \"AppPlanSubscriptionTrials\" apst on apst.shop = aps.shop\nWHERE aps.shop = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT aps.*,
 *        ap.name AS "appPlanName",
 *        ap.interval AS "appPlanInterval",
 *        apst."createdAt" AS "appPlanTrialCreatedAt"
 * FROM "AppPlanSubscription" aps
 *        JOIN "AppPlan" ap on ap.id = aps."appPlanId"
 *        JOIN "AppPlanSubscriptionTrials" apst on apst.shop = aps.shop
 * WHERE aps.shop = :shop!
 * ```
 */
export const getSubscription = new PreparedQuery<IGetSubscriptionParams,IGetSubscriptionResult>(getSubscriptionIR);


/** 'UpsertSubscription' parameters type */
export interface IUpsertSubscriptionParams {
  appPlanId: number;
  appSubscriptionShopifyId: string;
  appSubscriptionStatus: string;
  shop: string;
}

/** 'UpsertSubscription' return type */
export interface IUpsertSubscriptionResult {
  appPlanId: number;
  appSubscriptionShopifyId: string;
  appSubscriptionStatus: string;
  shop: string;
  updatedAt: Date;
}

/** 'UpsertSubscription' query type */
export interface IUpsertSubscriptionQuery {
  params: IUpsertSubscriptionParams;
  result: IUpsertSubscriptionResult;
}

const upsertSubscriptionIR: any = {"usedParamSet":{"shop":true,"appSubscriptionShopifyId":true,"appSubscriptionStatus":true,"appPlanId":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":97,"b":102},{"a":300,"b":305}]},{"name":"appSubscriptionShopifyId","required":true,"transform":{"type":"scalar"},"locs":[{"a":272,"b":297},{"a":443,"b":468}]},{"name":"appSubscriptionStatus","required":true,"transform":{"type":"scalar"},"locs":[{"a":308,"b":330},{"a":530,"b":552}]},{"name":"appPlanId","required":true,"transform":{"type":"scalar"},"locs":[{"a":333,"b":343},{"a":602,"b":612}]}],"statement":"WITH insertedSubscriptionTrial AS (\n  INSERT INTO \"AppPlanSubscriptionTrials\" (shop)\n    VALUES (:shop!)\n    ON CONFLICT (shop) DO NOTHING\n    RETURNING *\n)\nINSERT INTO \"AppPlanSubscription\" (\"appSubscriptionShopifyId\", shop, \"appSubscriptionStatus\", \"appPlanId\")\nVALUES (:appSubscriptionShopifyId!, :shop!, :appSubscriptionStatus!, :appPlanId!)\nON CONFLICT (\"shop\") DO UPDATE SET\n                                 \"appSubscriptionShopifyId\" = :appSubscriptionShopifyId!,\n                                 \"appSubscriptionStatus\" = :appSubscriptionStatus!,\n                                 \"appPlanId\" = :appPlanId!\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * WITH insertedSubscriptionTrial AS (
 *   INSERT INTO "AppPlanSubscriptionTrials" (shop)
 *     VALUES (:shop!)
 *     ON CONFLICT (shop) DO NOTHING
 *     RETURNING *
 * )
 * INSERT INTO "AppPlanSubscription" ("appSubscriptionShopifyId", shop, "appSubscriptionStatus", "appPlanId")
 * VALUES (:appSubscriptionShopifyId!, :shop!, :appSubscriptionStatus!, :appPlanId!)
 * ON CONFLICT ("shop") DO UPDATE SET
 *                                  "appSubscriptionShopifyId" = :appSubscriptionShopifyId!,
 *                                  "appSubscriptionStatus" = :appSubscriptionStatus!,
 *                                  "appPlanId" = :appPlanId!
 * RETURNING *
 * ```
 */
export const upsertSubscription = new PreparedQuery<IUpsertSubscriptionParams,IUpsertSubscriptionResult>(upsertSubscriptionIR);


/** 'Get' parameters type */
export interface IGetParams {
  id?: number | null | void;
  shop: string;
}

/** 'Get' return type */
export interface IGetResult {
  createdAt: Date;
  currencyCode: string;
  id: number;
  interval: AppPlanInterval;
  name: AppPlanName;
  price: number;
  trialDays: number;
  type: AppPlanType;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"shop":true,"id":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":180,"b":185}]},{"name":"id","required":false,"transform":{"type":"scalar"},"locs":[{"a":212,"b":214}]}],"statement":"SELECT ap.* FROM \"AppPlan\" ap\n                   LEFT JOIN \"AppPlanCustomAccess\" apca on ap.id = apca.\"appPlanId\"\nWHERE (ap.type = 'DEFAULT' OR (ap.type = 'CUSTOM' AND apca.shop = :shop!))\n  AND ap.id = COALESCE(:id, ap.id)"};

/**
 * Query generated from SQL:
 * ```
 * SELECT ap.* FROM "AppPlan" ap
 *                    LEFT JOIN "AppPlanCustomAccess" apca on ap.id = apca."appPlanId"
 * WHERE (ap.type = 'DEFAULT' OR (ap.type = 'CUSTOM' AND apca.shop = :shop!))
 *   AND ap.id = COALESCE(:id, ap.id)
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'RemoveByShop' parameters type */
export interface IRemoveByShopParams {
  shop: string;
}

/** 'RemoveByShop' return type */
export type IRemoveByShopResult = void;

/** 'RemoveByShop' query type */
export interface IRemoveByShopQuery {
  params: IRemoveByShopParams;
  result: IRemoveByShopResult;
}

const removeByShopIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":91,"b":96},{"a":169,"b":174}]}],"statement":"WITH deletedSubscription AS (\n  DELETE FROM \"AppPlanSubscription\" aps\n    WHERE aps.shop = :shop!\n    RETURNING *\n)\nDELETE FROM \"AppPlanCustomAccess\" ap\nWHERE ap.shop = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * WITH deletedSubscription AS (
 *   DELETE FROM "AppPlanSubscription" aps
 *     WHERE aps.shop = :shop!
 *     RETURNING *
 * )
 * DELETE FROM "AppPlanCustomAccess" ap
 * WHERE ap.shop = :shop!
 * ```
 */
export const removeByShop = new PreparedQuery<IRemoveByShopParams,IRemoveByShopResult>(removeByShopIR);


