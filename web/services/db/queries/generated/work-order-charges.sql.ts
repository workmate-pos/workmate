/** Types generated for queries found in "services/db/queries/work-order-charges.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'UpsertHourlyLabourCharge' parameters type */
export interface IUpsertHourlyLabourChargeParams {
  employeeId?: string | null | void;
  hours: string;
  hoursLocked: boolean;
  name: string;
  rate: string;
  rateLocked: boolean;
  removeLocked: boolean;
  shopifyOrderLineItemId?: string | null | void;
  uuid: string;
  workOrderId: number;
  workOrderItemUuid?: string | null | void;
}

/** 'UpsertHourlyLabourCharge' return type */
export type IUpsertHourlyLabourChargeResult = void;

/** 'UpsertHourlyLabourCharge' query type */
export interface IUpsertHourlyLabourChargeQuery {
  params: IUpsertHourlyLabourChargeParams;
  result: IUpsertHourlyLabourChargeResult;
}

const upsertHourlyLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"employeeId":true,"name":true,"rate":true,"hours":true,"workOrderItemUuid":true,"shopifyOrderLineItemId":true,"uuid":true,"rateLocked":true,"hoursLocked":true,"removeLocked":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":240,"b":252}]},{"name":"employeeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":255,"b":265}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":268,"b":273}]},{"name":"rate","required":true,"transform":{"type":"scalar"},"locs":[{"a":276,"b":281}]},{"name":"hours","required":true,"transform":{"type":"scalar"},"locs":[{"a":284,"b":290}]},{"name":"workOrderItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":293,"b":310}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":313,"b":335}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":338,"b":343}]},{"name":"rateLocked","required":true,"transform":{"type":"scalar"},"locs":[{"a":354,"b":365}]},{"name":"hoursLocked","required":true,"transform":{"type":"scalar"},"locs":[{"a":368,"b":380}]},{"name":"removeLocked","required":true,"transform":{"type":"scalar"},"locs":[{"a":383,"b":396}]}],"statement":"INSERT INTO \"WorkOrderHourlyLabourCharge\" (\"workOrderId\", \"employeeId\", name, rate, hours, \"workOrderItemUuid\",\n                                           \"shopifyOrderLineItemId\", uuid, \"rateLocked\", \"hoursLocked\", \"removeLocked\")\nVALUES (:workOrderId!, :employeeId, :name!, :rate!, :hours!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!,\n        :rateLocked!, :hoursLocked!, :removeLocked!)\nON CONFLICT (\"workOrderId\", uuid)\n  DO UPDATE\n  SET \"employeeId\"             = EXCLUDED.\"employeeId\",\n      name                     = EXCLUDED.name,\n      rate                     = EXCLUDED.rate,\n      hours                    = EXCLUDED.hours,\n      \"workOrderItemUuid\"      = EXCLUDED.\"workOrderItemUuid\",\n      \"shopifyOrderLineItemId\" = EXCLUDED.\"shopifyOrderLineItemId\",\n      \"rateLocked\"             = EXCLUDED.\"rateLocked\",\n      \"hoursLocked\"            = EXCLUDED.\"hoursLocked\",\n      \"removeLocked\"           = EXCLUDED.\"removeLocked\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderHourlyLabourCharge" ("workOrderId", "employeeId", name, rate, hours, "workOrderItemUuid",
 *                                            "shopifyOrderLineItemId", uuid, "rateLocked", "hoursLocked", "removeLocked")
 * VALUES (:workOrderId!, :employeeId, :name!, :rate!, :hours!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!,
 *         :rateLocked!, :hoursLocked!, :removeLocked!)
 * ON CONFLICT ("workOrderId", uuid)
 *   DO UPDATE
 *   SET "employeeId"             = EXCLUDED."employeeId",
 *       name                     = EXCLUDED.name,
 *       rate                     = EXCLUDED.rate,
 *       hours                    = EXCLUDED.hours,
 *       "workOrderItemUuid"      = EXCLUDED."workOrderItemUuid",
 *       "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
 *       "rateLocked"             = EXCLUDED."rateLocked",
 *       "hoursLocked"            = EXCLUDED."hoursLocked",
 *       "removeLocked"           = EXCLUDED."removeLocked"
 * ```
 */
export const upsertHourlyLabourCharge = new PreparedQuery<IUpsertHourlyLabourChargeParams,IUpsertHourlyLabourChargeResult>(upsertHourlyLabourChargeIR);


/** 'UpsertHourlyLabourCharges' parameters type */
export interface IUpsertHourlyLabourChargesParams {
  charges: readonly ({
    workOrderId: number,
    employeeId: string | null | void,
    name: string,
    rate: string,
    hours: string,
    workOrderItemUuid: string | null | void,
    shopifyOrderLineItemId: string | null | void,
    uuid: string,
    rateLocked: boolean,
    hoursLocked: boolean,
    removeLocked: boolean
  })[];
}

/** 'UpsertHourlyLabourCharges' return type */
export type IUpsertHourlyLabourChargesResult = void;

/** 'UpsertHourlyLabourCharges' query type */
export interface IUpsertHourlyLabourChargesQuery {
  params: IUpsertHourlyLabourChargesParams;
  result: IUpsertHourlyLabourChargesResult;
}

const upsertHourlyLabourChargesIR: any = {"usedParamSet":{"charges":true},"params":[{"name":"charges","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"workOrderId","required":true},{"name":"employeeId","required":false},{"name":"name","required":true},{"name":"rate","required":true},{"name":"hours","required":true},{"name":"workOrderItemUuid","required":false},{"name":"shopifyOrderLineItemId","required":false},{"name":"uuid","required":true},{"name":"rateLocked","required":true},{"name":"hoursLocked","required":true},{"name":"removeLocked","required":true}]},"locs":[{"a":327,"b":334}]}],"statement":"INSERT INTO \"WorkOrderHourlyLabourCharge\" (\"workOrderId\", \"employeeId\", name, rate, hours, \"workOrderItemUuid\",\n                                           \"shopifyOrderLineItemId\", uuid, \"rateLocked\", \"hoursLocked\", \"removeLocked\")\nVALUES (0, NULL, '', '', '', gen_random_uuid(), NULL, gen_random_uuid(), FALSE, FALSE, FALSE), :charges OFFSET 1\nON CONFLICT (\"workOrderId\", uuid)\n  DO UPDATE\n  SET \"employeeId\"             = EXCLUDED.\"employeeId\",\n      name                     = EXCLUDED.name,\n      rate                     = EXCLUDED.rate,\n      hours                    = EXCLUDED.hours,\n      \"workOrderItemUuid\"      = EXCLUDED.\"workOrderItemUuid\",\n      \"shopifyOrderLineItemId\" = EXCLUDED.\"shopifyOrderLineItemId\",\n      \"rateLocked\"             = EXCLUDED.\"rateLocked\",\n      \"hoursLocked\"            = EXCLUDED.\"hoursLocked\",\n      \"removeLocked\"           = EXCLUDED.\"removeLocked\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderHourlyLabourCharge" ("workOrderId", "employeeId", name, rate, hours, "workOrderItemUuid",
 *                                            "shopifyOrderLineItemId", uuid, "rateLocked", "hoursLocked", "removeLocked")
 * VALUES (0, NULL, '', '', '', gen_random_uuid(), NULL, gen_random_uuid(), FALSE, FALSE, FALSE), :charges OFFSET 1
 * ON CONFLICT ("workOrderId", uuid)
 *   DO UPDATE
 *   SET "employeeId"             = EXCLUDED."employeeId",
 *       name                     = EXCLUDED.name,
 *       rate                     = EXCLUDED.rate,
 *       hours                    = EXCLUDED.hours,
 *       "workOrderItemUuid"      = EXCLUDED."workOrderItemUuid",
 *       "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
 *       "rateLocked"             = EXCLUDED."rateLocked",
 *       "hoursLocked"            = EXCLUDED."hoursLocked",
 *       "removeLocked"           = EXCLUDED."removeLocked"
 * ```
 */
export const upsertHourlyLabourCharges = new PreparedQuery<IUpsertHourlyLabourChargesParams,IUpsertHourlyLabourChargesResult>(upsertHourlyLabourChargesIR);


/** 'UpsertFixedPriceLabourCharge' parameters type */
export interface IUpsertFixedPriceLabourChargeParams {
  amount: string;
  amountLocked: boolean;
  employeeId?: string | null | void;
  name: string;
  removeLocked: boolean;
  shopifyOrderLineItemId?: string | null | void;
  uuid: string;
  workOrderId: number;
  workOrderItemUuid?: string | null | void;
}

/** 'UpsertFixedPriceLabourCharge' return type */
export type IUpsertFixedPriceLabourChargeResult = void;

/** 'UpsertFixedPriceLabourCharge' query type */
export interface IUpsertFixedPriceLabourChargeQuery {
  params: IUpsertFixedPriceLabourChargeParams;
  result: IUpsertFixedPriceLabourChargeResult;
}

const upsertFixedPriceLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"employeeId":true,"name":true,"amount":true,"workOrderItemUuid":true,"shopifyOrderLineItemId":true,"uuid":true,"amountLocked":true,"removeLocked":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":230,"b":242}]},{"name":"employeeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":245,"b":255}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":258,"b":263}]},{"name":"amount","required":true,"transform":{"type":"scalar"},"locs":[{"a":266,"b":273}]},{"name":"workOrderItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":276,"b":293}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":296,"b":318}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":321,"b":326}]},{"name":"amountLocked","required":true,"transform":{"type":"scalar"},"locs":[{"a":337,"b":350}]},{"name":"removeLocked","required":true,"transform":{"type":"scalar"},"locs":[{"a":353,"b":366}]}],"statement":"INSERT INTO \"WorkOrderFixedPriceLabourCharge\" (\"workOrderId\", \"employeeId\", name, amount, \"workOrderItemUuid\",\n                                               \"shopifyOrderLineItemId\", uuid, \"amountLocked\", \"removeLocked\")\nVALUES (:workOrderId!, :employeeId, :name!, :amount!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!,\n        :amountLocked!, :removeLocked!)\nON CONFLICT (\"workOrderId\", uuid)\n  DO UPDATE\n  SET \"employeeId\"             = EXCLUDED.\"employeeId\",\n      name                     = EXCLUDED.name,\n      amount                   = EXCLUDED.amount,\n      \"workOrderItemUuid\"      = EXCLUDED.\"workOrderItemUuid\",\n      \"shopifyOrderLineItemId\" = EXCLUDED.\"shopifyOrderLineItemId\",\n      \"amountLocked\"           = EXCLUDED.\"amountLocked\",\n      \"removeLocked\"           = EXCLUDED.\"removeLocked\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderFixedPriceLabourCharge" ("workOrderId", "employeeId", name, amount, "workOrderItemUuid",
 *                                                "shopifyOrderLineItemId", uuid, "amountLocked", "removeLocked")
 * VALUES (:workOrderId!, :employeeId, :name!, :amount!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!,
 *         :amountLocked!, :removeLocked!)
 * ON CONFLICT ("workOrderId", uuid)
 *   DO UPDATE
 *   SET "employeeId"             = EXCLUDED."employeeId",
 *       name                     = EXCLUDED.name,
 *       amount                   = EXCLUDED.amount,
 *       "workOrderItemUuid"      = EXCLUDED."workOrderItemUuid",
 *       "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
 *       "amountLocked"           = EXCLUDED."amountLocked",
 *       "removeLocked"           = EXCLUDED."removeLocked"
 * ```
 */
export const upsertFixedPriceLabourCharge = new PreparedQuery<IUpsertFixedPriceLabourChargeParams,IUpsertFixedPriceLabourChargeResult>(upsertFixedPriceLabourChargeIR);


/** 'UpsertFixedPriceLabourCharges' parameters type */
export interface IUpsertFixedPriceLabourChargesParams {
  charges: readonly ({
    workOrderId: number,
    employeeId: string | null | void,
    name: string,
    amount: string,
    workOrderItemUuid: string | null | void,
    shopifyOrderLineItemId: string | null | void,
    uuid: string,
    amountLocked: boolean,
    removeLocked: boolean
  })[];
}

/** 'UpsertFixedPriceLabourCharges' return type */
export type IUpsertFixedPriceLabourChargesResult = void;

/** 'UpsertFixedPriceLabourCharges' query type */
export interface IUpsertFixedPriceLabourChargesQuery {
  params: IUpsertFixedPriceLabourChargesParams;
  result: IUpsertFixedPriceLabourChargesResult;
}

const upsertFixedPriceLabourChargesIR: any = {"usedParamSet":{"charges":true},"params":[{"name":"charges","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"workOrderId","required":true},{"name":"employeeId","required":false},{"name":"name","required":true},{"name":"amount","required":true},{"name":"workOrderItemUuid","required":false},{"name":"shopifyOrderLineItemId","required":false},{"name":"uuid","required":true},{"name":"amountLocked","required":true},{"name":"removeLocked","required":true}]},"locs":[{"a":306,"b":313}]}],"statement":"INSERT INTO \"WorkOrderFixedPriceLabourCharge\" (\"workOrderId\", \"employeeId\", name, amount, \"workOrderItemUuid\",\n                                               \"shopifyOrderLineItemId\", uuid, \"amountLocked\", \"removeLocked\")\nVALUES (0, NULL, '', '', gen_random_uuid(), NULL, gen_random_uuid(), FALSE, FALSE), :charges OFFSET 1\nON CONFLICT (\"workOrderId\", uuid)\n  DO UPDATE\n  SET \"employeeId\"             = EXCLUDED.\"employeeId\",\n      name                     = EXCLUDED.name,\n      amount                   = EXCLUDED.amount,\n      \"workOrderItemUuid\"      = EXCLUDED.\"workOrderItemUuid\",\n      \"shopifyOrderLineItemId\" = EXCLUDED.\"shopifyOrderLineItemId\",\n      \"amountLocked\"           = EXCLUDED.\"amountLocked\",\n      \"removeLocked\"           = EXCLUDED.\"removeLocked\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderFixedPriceLabourCharge" ("workOrderId", "employeeId", name, amount, "workOrderItemUuid",
 *                                                "shopifyOrderLineItemId", uuid, "amountLocked", "removeLocked")
 * VALUES (0, NULL, '', '', gen_random_uuid(), NULL, gen_random_uuid(), FALSE, FALSE), :charges OFFSET 1
 * ON CONFLICT ("workOrderId", uuid)
 *   DO UPDATE
 *   SET "employeeId"             = EXCLUDED."employeeId",
 *       name                     = EXCLUDED.name,
 *       amount                   = EXCLUDED.amount,
 *       "workOrderItemUuid"      = EXCLUDED."workOrderItemUuid",
 *       "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
 *       "amountLocked"           = EXCLUDED."amountLocked",
 *       "removeLocked"           = EXCLUDED."removeLocked"
 * ```
 */
export const upsertFixedPriceLabourCharges = new PreparedQuery<IUpsertFixedPriceLabourChargesParams,IUpsertFixedPriceLabourChargesResult>(upsertFixedPriceLabourChargesIR);


/** 'RemoveHourlyLabourCharge' parameters type */
export interface IRemoveHourlyLabourChargeParams {
  uuid: string;
  workOrderId: number;
}

/** 'RemoveHourlyLabourCharge' return type */
export type IRemoveHourlyLabourChargeResult = void;

/** 'RemoveHourlyLabourCharge' query type */
export interface IRemoveHourlyLabourChargeQuery {
  params: IRemoveHourlyLabourChargeParams;
  result: IRemoveHourlyLabourChargeResult;
}

const removeHourlyLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"uuid":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":70,"b":82}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":100,"b":105}]}],"statement":"DELETE\nFROM \"WorkOrderHourlyLabourCharge\" hl\nWHERE hl.\"workOrderId\" = :workOrderId!\n  AND hl.uuid = :uuid!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "WorkOrderHourlyLabourCharge" hl
 * WHERE hl."workOrderId" = :workOrderId!
 *   AND hl.uuid = :uuid!
 * ```
 */
export const removeHourlyLabourCharge = new PreparedQuery<IRemoveHourlyLabourChargeParams,IRemoveHourlyLabourChargeResult>(removeHourlyLabourChargeIR);


/** 'RemoveFixedPriceLabourCharge' parameters type */
export interface IRemoveFixedPriceLabourChargeParams {
  uuid: string;
  workOrderId: number;
}

/** 'RemoveFixedPriceLabourCharge' return type */
export type IRemoveFixedPriceLabourChargeResult = void;

/** 'RemoveFixedPriceLabourCharge' query type */
export interface IRemoveFixedPriceLabourChargeQuery {
  params: IRemoveFixedPriceLabourChargeParams;
  result: IRemoveFixedPriceLabourChargeResult;
}

const removeFixedPriceLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"uuid":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":76,"b":88}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":107,"b":112}]}],"statement":"DELETE\nFROM \"WorkOrderFixedPriceLabourCharge\" fpl\nWHERE fpl.\"workOrderId\" = :workOrderId!\n  AND fpl.uuid = :uuid!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "WorkOrderFixedPriceLabourCharge" fpl
 * WHERE fpl."workOrderId" = :workOrderId!
 *   AND fpl.uuid = :uuid!
 * ```
 */
export const removeFixedPriceLabourCharge = new PreparedQuery<IRemoveFixedPriceLabourChargeParams,IRemoveFixedPriceLabourChargeResult>(removeFixedPriceLabourChargeIR);


/** 'GetHourlyLabourCharges' parameters type */
export interface IGetHourlyLabourChargesParams {
  workOrderId: number;
}

/** 'GetHourlyLabourCharges' return type */
export interface IGetHourlyLabourChargesResult {
  createdAt: Date;
  employeeId: string | null;
  hours: string;
  hoursLocked: boolean;
  name: string;
  rate: string;
  rateLocked: boolean;
  removeLocked: boolean;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderCustomItemUuid: string | null;
  workOrderId: number;
  workOrderItemUuid: string | null;
}

/** 'GetHourlyLabourCharges' query type */
export interface IGetHourlyLabourChargesQuery {
  params: IGetHourlyLabourChargesParams;
  result: IGetHourlyLabourChargesResult;
}

const getHourlyLabourChargesIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":66,"b":78}]}],"statement":"SELECT *\nFROM \"WorkOrderHourlyLabourCharge\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderHourlyLabourCharge"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getHourlyLabourCharges = new PreparedQuery<IGetHourlyLabourChargesParams,IGetHourlyLabourChargesResult>(getHourlyLabourChargesIR);


/** 'GetFixedPriceLabourCharges' parameters type */
export interface IGetFixedPriceLabourChargesParams {
  workOrderId: number;
}

/** 'GetFixedPriceLabourCharges' return type */
export interface IGetFixedPriceLabourChargesResult {
  amount: string;
  amountLocked: boolean;
  createdAt: Date;
  employeeId: string | null;
  name: string;
  removeLocked: boolean;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderCustomItemUuid: string | null;
  workOrderId: number;
  workOrderItemUuid: string | null;
}

/** 'GetFixedPriceLabourCharges' query type */
export interface IGetFixedPriceLabourChargesQuery {
  params: IGetFixedPriceLabourChargesParams;
  result: IGetFixedPriceLabourChargesResult;
}

const getFixedPriceLabourChargesIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":70,"b":82}]}],"statement":"SELECT *\nFROM \"WorkOrderFixedPriceLabourCharge\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderFixedPriceLabourCharge"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getFixedPriceLabourCharges = new PreparedQuery<IGetFixedPriceLabourChargesParams,IGetFixedPriceLabourChargesResult>(getFixedPriceLabourChargesIR);


/** 'GetHourlyLabourChargesByUuids' parameters type */
export interface IGetHourlyLabourChargesByUuidsParams {
  uuids: readonly (string)[];
  workOrderId: number;
}

/** 'GetHourlyLabourChargesByUuids' return type */
export interface IGetHourlyLabourChargesByUuidsResult {
  createdAt: Date;
  employeeId: string | null;
  hours: string;
  hoursLocked: boolean;
  name: string;
  rate: string;
  rateLocked: boolean;
  removeLocked: boolean;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderCustomItemUuid: string | null;
  workOrderId: number;
  workOrderItemUuid: string | null;
}

/** 'GetHourlyLabourChargesByUuids' query type */
export interface IGetHourlyLabourChargesByUuidsQuery {
  params: IGetHourlyLabourChargesByUuidsParams;
  result: IGetHourlyLabourChargesByUuidsResult;
}

const getHourlyLabourChargesByUuidsIR: any = {"usedParamSet":{"uuids":true,"workOrderId":true},"params":[{"name":"uuids","required":true,"transform":{"type":"array_spread"},"locs":[{"a":58,"b":64}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":88,"b":100}]}],"statement":"SELECT *\nFROM \"WorkOrderHourlyLabourCharge\"\nWHERE uuid IN :uuids!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderHourlyLabourCharge"
 * WHERE uuid IN :uuids!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const getHourlyLabourChargesByUuids = new PreparedQuery<IGetHourlyLabourChargesByUuidsParams,IGetHourlyLabourChargesByUuidsResult>(getHourlyLabourChargesByUuidsIR);


/** 'GetFixedPriceLabourChargesByUuids' parameters type */
export interface IGetFixedPriceLabourChargesByUuidsParams {
  uuids: readonly (string)[];
  workOrderId: number;
}

/** 'GetFixedPriceLabourChargesByUuids' return type */
export interface IGetFixedPriceLabourChargesByUuidsResult {
  amount: string;
  amountLocked: boolean;
  createdAt: Date;
  employeeId: string | null;
  name: string;
  removeLocked: boolean;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderCustomItemUuid: string | null;
  workOrderId: number;
  workOrderItemUuid: string | null;
}

/** 'GetFixedPriceLabourChargesByUuids' query type */
export interface IGetFixedPriceLabourChargesByUuidsQuery {
  params: IGetFixedPriceLabourChargesByUuidsParams;
  result: IGetFixedPriceLabourChargesByUuidsResult;
}

const getFixedPriceLabourChargesByUuidsIR: any = {"usedParamSet":{"uuids":true,"workOrderId":true},"params":[{"name":"uuids","required":true,"transform":{"type":"array_spread"},"locs":[{"a":62,"b":68}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":92,"b":104}]}],"statement":"SELECT *\nFROM \"WorkOrderFixedPriceLabourCharge\"\nWHERE uuid IN :uuids!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderFixedPriceLabourCharge"
 * WHERE uuid IN :uuids!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const getFixedPriceLabourChargesByUuids = new PreparedQuery<IGetFixedPriceLabourChargesByUuidsParams,IGetFixedPriceLabourChargesByUuidsResult>(getFixedPriceLabourChargesByUuidsIR);


/** 'SetHourlyLabourChargeShopifyOrderLineItemId' parameters type */
export interface ISetHourlyLabourChargeShopifyOrderLineItemIdParams {
  shopifyOrderLineItemId: string;
  uuid: string;
  workOrderId: number;
}

/** 'SetHourlyLabourChargeShopifyOrderLineItemId' return type */
export type ISetHourlyLabourChargeShopifyOrderLineItemIdResult = void;

/** 'SetHourlyLabourChargeShopifyOrderLineItemId' query type */
export interface ISetHourlyLabourChargeShopifyOrderLineItemIdQuery {
  params: ISetHourlyLabourChargeShopifyOrderLineItemIdParams;
  result: ISetHourlyLabourChargeShopifyOrderLineItemIdResult;
}

const setHourlyLabourChargeShopifyOrderLineItemIdIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true,"uuid":true,"workOrderId":true},"params":[{"name":"shopifyOrderLineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":68,"b":91}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":111}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":135,"b":147}]}],"statement":"UPDATE \"WorkOrderHourlyLabourCharge\"\nSET \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId!\nWHERE uuid = :uuid!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "WorkOrderHourlyLabourCharge"
 * SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
 * WHERE uuid = :uuid!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const setHourlyLabourChargeShopifyOrderLineItemId = new PreparedQuery<ISetHourlyLabourChargeShopifyOrderLineItemIdParams,ISetHourlyLabourChargeShopifyOrderLineItemIdResult>(setHourlyLabourChargeShopifyOrderLineItemIdIR);


/** 'SetFixedPriceLabourChargeShopifyOrderLineItemId' parameters type */
export interface ISetFixedPriceLabourChargeShopifyOrderLineItemIdParams {
  shopifyOrderLineItemId: string;
  uuid: string;
  workOrderId: number;
}

/** 'SetFixedPriceLabourChargeShopifyOrderLineItemId' return type */
export type ISetFixedPriceLabourChargeShopifyOrderLineItemIdResult = void;

/** 'SetFixedPriceLabourChargeShopifyOrderLineItemId' query type */
export interface ISetFixedPriceLabourChargeShopifyOrderLineItemIdQuery {
  params: ISetFixedPriceLabourChargeShopifyOrderLineItemIdParams;
  result: ISetFixedPriceLabourChargeShopifyOrderLineItemIdResult;
}

const setFixedPriceLabourChargeShopifyOrderLineItemIdIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true,"uuid":true,"workOrderId":true},"params":[{"name":"shopifyOrderLineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":72,"b":95}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":110,"b":115}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":139,"b":151}]}],"statement":"UPDATE \"WorkOrderFixedPriceLabourCharge\"\nSET \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId!\nWHERE uuid = :uuid!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "WorkOrderFixedPriceLabourCharge"
 * SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
 * WHERE uuid = :uuid!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const setFixedPriceLabourChargeShopifyOrderLineItemId = new PreparedQuery<ISetFixedPriceLabourChargeShopifyOrderLineItemIdParams,ISetFixedPriceLabourChargeShopifyOrderLineItemIdResult>(setFixedPriceLabourChargeShopifyOrderLineItemIdIR);


