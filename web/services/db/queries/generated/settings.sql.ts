/** Types generated for queries found in "services/db/queries/settings.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'UpsertSetting' parameters type */
export interface IUpsertSettingParams {
  key: string;
  shop: string;
  value: string;
}

/** 'UpsertSetting' return type */
export interface IUpsertSettingResult {
  key: string;
  shop: string;
  value: string;
}

/** 'UpsertSetting' query type */
export interface IUpsertSettingQuery {
  params: IUpsertSettingParams;
  result: IUpsertSettingResult;
}

const upsertSettingIR: any = {"usedParamSet":{"shop":true,"key":true,"value":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":50,"b":55}]},{"name":"key","required":true,"transform":{"type":"scalar"},"locs":[{"a":58,"b":62}]},{"name":"value","required":true,"transform":{"type":"scalar"},"locs":[{"a":65,"b":71},{"a":120,"b":126}]}],"statement":"INSERT INTO \"Settings\" (shop, key, value)\nVALUES (:shop!, :key!, :value!)\nON CONFLICT (shop, key) DO UPDATE SET value = :value!\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "Settings" (shop, key, value)
 * VALUES (:shop!, :key!, :value!)
 * ON CONFLICT (shop, key) DO UPDATE SET value = :value!
 * RETURNING *
 * ```
 */
export const upsertSetting = new PreparedQuery<IUpsertSettingParams,IUpsertSettingResult>(upsertSettingIR);


/** 'Get' parameters type */
export interface IGetParams {
  shop: string;
}

/** 'Get' return type */
export interface IGetResult {
  key: string;
  value: string;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":47,"b":52}]}],"statement":"SELECT key, value\nFROM \"Settings\"\nWHERE shop = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT key, value
 * FROM "Settings"
 * WHERE shop = :shop!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'InsertSettingIfNotExists' parameters type */
export interface IInsertSettingIfNotExistsParams {
  key: string;
  shop: string;
  value: string;
}

/** 'InsertSettingIfNotExists' return type */
export interface IInsertSettingIfNotExistsResult {
  key: string;
  shop: string;
  value: string;
}

/** 'InsertSettingIfNotExists' query type */
export interface IInsertSettingIfNotExistsQuery {
  params: IInsertSettingIfNotExistsParams;
  result: IInsertSettingIfNotExistsResult;
}

const insertSettingIfNotExistsIR: any = {"usedParamSet":{"shop":true,"key":true,"value":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":49,"b":54}]},{"name":"key","required":true,"transform":{"type":"scalar"},"locs":[{"a":57,"b":61}]},{"name":"value","required":true,"transform":{"type":"scalar"},"locs":[{"a":64,"b":70}]}],"statement":"INSERT INTO \"Settings\" (shop, key, value)\nSELECT :shop!, :key!, :value!\nON CONFLICT DO NOTHING\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "Settings" (shop, key, value)
 * SELECT :shop!, :key!, :value!
 * ON CONFLICT DO NOTHING
 * RETURNING *
 * ```
 */
export const insertSettingIfNotExists = new PreparedQuery<IInsertSettingIfNotExistsParams,IInsertSettingIfNotExistsResult>(insertSettingIfNotExistsIR);


