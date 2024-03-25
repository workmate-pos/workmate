/** Types generated for queries found in "services/db/queries/shopify-session.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

/** 'Remove' parameters type */
export interface IRemoveParams {
  ids: readonly (string)[];
}

/** 'Remove' return type */
export interface IRemoveResult {
  accessToken: string | null;
  expires: Date | null;
  id: string;
  isOnline: boolean;
  onlineAccessInfo: string | null;
  scope: string | null;
  shop: string;
  state: string;
}

/** 'Remove' query type */
export interface IRemoveQuery {
  params: IRemoveParams;
  result: IRemoveResult;
}

const removeIR: any = {"usedParamSet":{"ids":true},"params":[{"name":"ids","required":true,"transform":{"type":"array_spread"},"locs":[{"a":41,"b":45}]}],"statement":"DELETE\nFROM \"ShopifySession\"\nWHERE id IN :ids!\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "ShopifySession"
 * WHERE id IN :ids!
 * RETURNING *
 * ```
 */
export const remove = new PreparedQuery<IRemoveParams,IRemoveResult>(removeIR);


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

const removeByShopIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":42,"b":47}]}],"statement":"DELETE\nFROM \"ShopifySession\"\nWHERE shop = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "ShopifySession"
 * WHERE shop = :shop!
 * ```
 */
export const removeByShop = new PreparedQuery<IRemoveByShopParams,IRemoveByShopResult>(removeByShopIR);


/** 'Get' parameters type */
export interface IGetParams {
  id?: string | null | void;
  isOnline?: boolean | null | void;
  limit?: NumberOrString | null | void;
  shop?: string | null | void;
}

/** 'Get' return type */
export interface IGetResult {
  accessToken: string | null;
  expires: Date | null;
  id: string;
  isOnline: boolean;
  onlineAccessInfo: string | null;
  scope: string | null;
  shop: string;
  state: string;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"id":true,"shop":true,"isOnline":true,"limit":true},"params":[{"name":"id","required":false,"transform":{"type":"scalar"},"locs":[{"a":51,"b":53}]},{"name":"shop","required":false,"transform":{"type":"scalar"},"locs":[{"a":82,"b":86}]},{"name":"isOnline","required":false,"transform":{"type":"scalar"},"locs":[{"a":123,"b":131}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":152,"b":157}]}],"statement":"SELECT *\nFROM \"ShopifySession\"\nWHERE id = COALESCE(:id, id)\n  AND shop = COALESCE(:shop, shop)\n  AND \"isOnline\" = COALESCE(:isOnline, \"isOnline\")\nLIMIT :limit"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "ShopifySession"
 * WHERE id = COALESCE(:id, id)
 *   AND shop = COALESCE(:shop, shop)
 *   AND "isOnline" = COALESCE(:isOnline, "isOnline")
 * LIMIT :limit
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  accessToken?: string | null | void;
  expires?: DateOrString | null | void;
  id: string;
  isOnline: boolean;
  onlineAccessInfo?: string | null | void;
  scope?: string | null | void;
  shop: string;
  state: string;
}

/** 'Upsert' return type */
export interface IUpsertResult {
  accessToken: string | null;
  expires: Date | null;
  id: string;
  isOnline: boolean;
  onlineAccessInfo: string | null;
  scope: string | null;
  shop: string;
  state: string;
}

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"id":true,"shop":true,"state":true,"isOnline":true,"scope":true,"expires":true,"onlineAccessInfo":true,"accessToken":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":118,"b":121}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":124,"b":129},{"a":256,"b":261}]},{"name":"state","required":true,"transform":{"type":"scalar"},"locs":[{"a":132,"b":138},{"a":316,"b":322}]},{"name":"isOnline","required":true,"transform":{"type":"scalar"},"locs":[{"a":141,"b":150},{"a":377,"b":386}]},{"name":"scope","required":false,"transform":{"type":"scalar"},"locs":[{"a":153,"b":158},{"a":441,"b":446}]},{"name":"expires","required":false,"transform":{"type":"scalar"},"locs":[{"a":161,"b":168},{"a":501,"b":508}]},{"name":"onlineAccessInfo","required":false,"transform":{"type":"scalar"},"locs":[{"a":171,"b":187},{"a":563,"b":579}]},{"name":"accessToken","required":false,"transform":{"type":"scalar"},"locs":[{"a":190,"b":201},{"a":634,"b":645}]}],"statement":"INSERT INTO \"ShopifySession\" (id, shop, state, \"isOnline\", scope, expires, \"onlineAccessInfo\", \"accessToken\")\nVALUES (:id!, :shop!, :state!, :isOnline!, :scope, :expires, :onlineAccessInfo, :accessToken)\nON CONFLICT (id) DO UPDATE SET shop               = :shop!,\n                               state              = :state!,\n                               \"isOnline\"         = :isOnline!,\n                               scope              = :scope,\n                               expires            = :expires,\n                               \"onlineAccessInfo\" = :onlineAccessInfo,\n                               \"accessToken\"      = :accessToken\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "ShopifySession" (id, shop, state, "isOnline", scope, expires, "onlineAccessInfo", "accessToken")
 * VALUES (:id!, :shop!, :state!, :isOnline!, :scope, :expires, :onlineAccessInfo, :accessToken)
 * ON CONFLICT (id) DO UPDATE SET shop               = :shop!,
 *                                state              = :state!,
 *                                "isOnline"         = :isOnline!,
 *                                scope              = :scope,
 *                                expires            = :expires,
 *                                "onlineAccessInfo" = :onlineAccessInfo,
 *                                "accessToken"      = :accessToken
 * RETURNING *
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'GetOnlineAccessInfoByShop' parameters type */
export interface IGetOnlineAccessInfoByShopParams {
  shop: string;
}

/** 'GetOnlineAccessInfoByShop' return type */
export interface IGetOnlineAccessInfoByShopResult {
  onlineAccessInfo: string | null;
}

/** 'GetOnlineAccessInfoByShop' query type */
export interface IGetOnlineAccessInfoByShopQuery {
  params: IGetOnlineAccessInfoByShopParams;
  result: IGetOnlineAccessInfoByShopResult;
}

const getOnlineAccessInfoByShopIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":61,"b":66}]}],"statement":"SELECT \"onlineAccessInfo\"\nFROM \"ShopifySession\"\nWHERE shop = :shop!\n  AND \"isOnline\" = true"};

/**
 * Query generated from SQL:
 * ```
 * SELECT "onlineAccessInfo"
 * FROM "ShopifySession"
 * WHERE shop = :shop!
 *   AND "isOnline" = true
 * ```
 */
export const getOnlineAccessInfoByShop = new PreparedQuery<IGetOnlineAccessInfoByShopParams,IGetOnlineAccessInfoByShopResult>(getOnlineAccessInfoByShopIR);


