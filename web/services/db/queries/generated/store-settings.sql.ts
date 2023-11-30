/** Types generated for queries found in "services/db/queries/store-settings.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'Get' parameters type */
export interface IGetParams {
  shop: string;
}

/** 'Get' return type */
export interface IGetResult {
  currencyCode: string;
  currencyFormat: string;
  name: string;
  shop: string;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":50,"b":55}]}],"statement":"SELECT *\nFROM \"ShopifyStoreSettings\"\nWHERE shop = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "ShopifyStoreSettings"
 * WHERE shop = :shop!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  currencyCode: string;
  currencyFormat: string;
  name: string;
  shop: string;
}

/** 'Upsert' return type */
export interface IUpsertResult {
  currencyCode: string;
  currencyFormat: string;
  name: string;
  shop: string;
}

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"currencyCode":true,"currencyFormat":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":90,"b":95}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":98,"b":103},{"a":182,"b":187}]},{"name":"currencyCode","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":119},{"a":209,"b":222}]},{"name":"currencyFormat","required":true,"transform":{"type":"scalar"},"locs":[{"a":122,"b":137},{"a":246,"b":261}]}],"statement":"INSERT INTO \"ShopifyStoreSettings\" (shop, name, \"currencyCode\", \"currencyFormat\")\nVALUES (:shop!, :name!, :currencyCode!, :currencyFormat!)\nON CONFLICT (shop) DO UPDATE SET\n  name = :name!,\n  \"currencyCode\" = :currencyCode!,\n  \"currencyFormat\" = :currencyFormat!\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "ShopifyStoreSettings" (shop, name, "currencyCode", "currencyFormat")
 * VALUES (:shop!, :name!, :currencyCode!, :currencyFormat!)
 * ON CONFLICT (shop) DO UPDATE SET
 *   name = :name!,
 *   "currencyCode" = :currencyCode!,
 *   "currencyFormat" = :currencyFormat!
 * RETURNING *
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


