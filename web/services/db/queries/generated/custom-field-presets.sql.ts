/** Types generated for queries found in "services/db/queries/custom-field-presets.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type CustomFieldsPresetType = 'PURCHASE_ORDER' | 'WORK_ORDER';

export type stringArray = (string)[];

/** 'GetCustomFieldsPresets' parameters type */
export interface IGetCustomFieldsPresetsParams {
  shop: string;
  type?: CustomFieldsPresetType | null | void;
}

/** 'GetCustomFieldsPresets' return type */
export interface IGetCustomFieldsPresetsResult {
  createdAt: Date;
  id: number;
  keys: stringArray | null;
  name: string;
  shop: string;
  type: CustomFieldsPresetType;
  updatedAt: Date;
}

/** 'GetCustomFieldsPresets' query type */
export interface IGetCustomFieldsPresetsQuery {
  params: IGetCustomFieldsPresetsParams;
  result: IGetCustomFieldsPresetsResult;
}

const getCustomFieldsPresetsIR: any = {"usedParamSet":{"shop":true,"type":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":48,"b":53}]},{"name":"type","required":false,"transform":{"type":"scalar"},"locs":[{"a":77,"b":81}]}],"statement":"SELECT *\nFROM \"CustomFieldsPreset\"\nWHERE shop = :shop!\n  AND type = COALESCE(:type, type)"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "CustomFieldsPreset"
 * WHERE shop = :shop!
 *   AND type = COALESCE(:type, type)
 * ```
 */
export const getCustomFieldsPresets = new PreparedQuery<IGetCustomFieldsPresetsParams,IGetCustomFieldsPresetsResult>(getCustomFieldsPresetsIR);


/** 'UpsertCustomFieldsPreset' parameters type */
export interface IUpsertCustomFieldsPresetParams {
  keys: stringArray;
  name: string;
  shop: string;
  type: CustomFieldsPresetType;
}

/** 'UpsertCustomFieldsPreset' return type */
export type IUpsertCustomFieldsPresetResult = void;

/** 'UpsertCustomFieldsPreset' query type */
export interface IUpsertCustomFieldsPresetQuery {
  params: IUpsertCustomFieldsPresetParams;
  result: IUpsertCustomFieldsPresetResult;
}

const upsertCustomFieldsPresetIR: any = {"usedParamSet":{"shop":true,"name":true,"type":true,"keys":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":66,"b":71}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":79}]},{"name":"type","required":true,"transform":{"type":"scalar"},"locs":[{"a":82,"b":87}]},{"name":"keys","required":true,"transform":{"type":"scalar"},"locs":[{"a":90,"b":95},{"a":152,"b":157}]}],"statement":"INSERT INTO \"CustomFieldsPreset\" (shop, name, type, keys)\nVALUES (:shop!, :name!, :type!, :keys!)\nON CONFLICT (shop, type, name) DO UPDATE\n  SET keys = :keys!"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "CustomFieldsPreset" (shop, name, type, keys)
 * VALUES (:shop!, :name!, :type!, :keys!)
 * ON CONFLICT (shop, type, name) DO UPDATE
 *   SET keys = :keys!
 * ```
 */
export const upsertCustomFieldsPreset = new PreparedQuery<IUpsertCustomFieldsPresetParams,IUpsertCustomFieldsPresetResult>(upsertCustomFieldsPresetIR);


/** 'RemoveCustomFieldsPreset' parameters type */
export interface IRemoveCustomFieldsPresetParams {
  name: string;
  shop: string;
  type: CustomFieldsPresetType;
}

/** 'RemoveCustomFieldsPreset' return type */
export type IRemoveCustomFieldsPresetResult = void;

/** 'RemoveCustomFieldsPreset' query type */
export interface IRemoveCustomFieldsPresetQuery {
  params: IRemoveCustomFieldsPresetParams;
  result: IRemoveCustomFieldsPresetResult;
}

const removeCustomFieldsPresetIR: any = {"usedParamSet":{"shop":true,"type":true,"name":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":46,"b":51}]},{"name":"type","required":true,"transform":{"type":"scalar"},"locs":[{"a":66,"b":71}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":86,"b":91}]}],"statement":"DELETE\nFROM \"CustomFieldsPreset\"\nWHERE shop = :shop!\n  AND type = :type!\n  AND name = :name!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "CustomFieldsPreset"
 * WHERE shop = :shop!
 *   AND type = :type!
 *   AND name = :name!
 * ```
 */
export const removeCustomFieldsPreset = new PreparedQuery<IRemoveCustomFieldsPresetParams,IRemoveCustomFieldsPresetResult>(removeCustomFieldsPresetIR);

