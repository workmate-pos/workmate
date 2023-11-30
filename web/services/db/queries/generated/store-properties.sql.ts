/** Types generated for queries found in "services/db/queries/store-properties.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** Query 'Get' is invalid, so its result is assigned type 'never'.
 *  */
export type IGetResult = never;

/** Query 'Get' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IGetParams = never;

const getIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":52,"b":57}]}],"statement":"SELECT *\nFROM \"ShopifyStoreProperties\"\nWHERE shop = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "ShopifyStoreProperties"
 * WHERE shop = :shop!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** Query 'Upsert' is invalid, so its result is assigned type 'never'.
 *  */
export type IUpsertResult = never;

/** Query 'Upsert' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IUpsertParams = never;

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"currencyCode":true,"currencyFormat":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":92,"b":97}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":100,"b":105},{"a":184,"b":189}]},{"name":"currencyCode","required":true,"transform":{"type":"scalar"},"locs":[{"a":108,"b":121},{"a":211,"b":224}]},{"name":"currencyFormat","required":true,"transform":{"type":"scalar"},"locs":[{"a":124,"b":139},{"a":248,"b":263}]}],"statement":"INSERT INTO \"ShopifyStoreProperties\" (shop, name, \"currencyCode\", \"currencyFormat\")\nVALUES (:shop!, :name!, :currencyCode!, :currencyFormat!)\nON CONFLICT (shop) DO UPDATE SET\n  name = :name!,\n  \"currencyCode\" = :currencyCode!,\n  \"currencyFormat\" = :currencyFormat!\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "ShopifyStoreProperties" (shop, name, "currencyCode", "currencyFormat")
 * VALUES (:shop!, :name!, :currencyCode!, :currencyFormat!)
 * ON CONFLICT (shop) DO UPDATE SET
 *   name = :name!,
 *   "currencyCode" = :currencyCode!,
 *   "currencyFormat" = :currencyFormat!
 * RETURNING *
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


