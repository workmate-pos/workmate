/** Types generated for queries found in "services/db/queries/work-order-labour.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'InsertHourlyLabourCharge' parameters type */
export interface IInsertHourlyLabourChargeParams {
  employeeId?: string | null | void;
  hours: string;
  name: string;
  rate: string;
  shopifyOrderLineItemId?: string | null | void;
  uuid: string;
  workOrderId: number;
  workOrderItemUuid?: string | null | void;
}

/** 'InsertHourlyLabourCharge' return type */
export type IInsertHourlyLabourChargeResult = void;

/** 'InsertHourlyLabourCharge' query type */
export interface IInsertHourlyLabourChargeQuery {
  params: IInsertHourlyLabourChargeParams;
  result: IInsertHourlyLabourChargeResult;
}

const insertHourlyLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"employeeId":true,"name":true,"rate":true,"hours":true,"workOrderItemUuid":true,"shopifyOrderLineItemId":true,"uuid":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":177,"b":189}]},{"name":"employeeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":192,"b":202}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":205,"b":210}]},{"name":"rate","required":true,"transform":{"type":"scalar"},"locs":[{"a":213,"b":218}]},{"name":"hours","required":true,"transform":{"type":"scalar"},"locs":[{"a":221,"b":227}]},{"name":"workOrderItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":230,"b":247}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":250,"b":272}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":275,"b":280}]}],"statement":"INSERT INTO \"HourlyLabourCharge\" (\"workOrderId\", \"employeeId\", name, rate, hours, \"workOrderItemUuid\",\n                                  \"shopifyOrderLineItemId\", uuid)\nVALUES (:workOrderId!, :employeeId, :name!, :rate!, :hours!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "HourlyLabourCharge" ("workOrderId", "employeeId", name, rate, hours, "workOrderItemUuid",
 *                                   "shopifyOrderLineItemId", uuid)
 * VALUES (:workOrderId!, :employeeId, :name!, :rate!, :hours!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!)
 * ```
 */
export const insertHourlyLabourCharge = new PreparedQuery<IInsertHourlyLabourChargeParams,IInsertHourlyLabourChargeResult>(insertHourlyLabourChargeIR);


/** 'InsertFixedPriceLabourCharge' parameters type */
export interface IInsertFixedPriceLabourChargeParams {
  amount: string;
  employeeId?: string | null | void;
  name: string;
  shopifyOrderLineItemId?: string | null | void;
  uuid: string;
  workOrderId: number;
  workOrderItemUuid?: string | null | void;
}

/** 'InsertFixedPriceLabourCharge' return type */
export type IInsertFixedPriceLabourChargeResult = void;

/** 'InsertFixedPriceLabourCharge' query type */
export interface IInsertFixedPriceLabourChargeQuery {
  params: IInsertFixedPriceLabourChargeParams;
  result: IInsertFixedPriceLabourChargeResult;
}

const insertFixedPriceLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"employeeId":true,"name":true,"amount":true,"workOrderItemUuid":true,"shopifyOrderLineItemId":true,"uuid":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":180,"b":192}]},{"name":"employeeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":195,"b":205}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":208,"b":213}]},{"name":"amount","required":true,"transform":{"type":"scalar"},"locs":[{"a":216,"b":223}]},{"name":"workOrderItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":226,"b":243}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":246,"b":268}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":271,"b":276}]}],"statement":"INSERT INTO \"FixedPriceLabourCharge\" (\"workOrderId\", \"employeeId\", name, amount, \"workOrderItemUuid\",\n                                      \"shopifyOrderLineItemId\", uuid)\nVALUES (:workOrderId!, :employeeId, :name!, :amount!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "FixedPriceLabourCharge" ("workOrderId", "employeeId", name, amount, "workOrderItemUuid",
 *                                       "shopifyOrderLineItemId", uuid)
 * VALUES (:workOrderId!, :employeeId, :name!, :amount!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!)
 * ```
 */
export const insertFixedPriceLabourCharge = new PreparedQuery<IInsertFixedPriceLabourChargeParams,IInsertFixedPriceLabourChargeResult>(insertFixedPriceLabourChargeIR);


/** 'RemoveHourlyLabourCharge' parameters type */
export interface IRemoveHourlyLabourChargeParams {
  workOrderId: number;
}

/** 'RemoveHourlyLabourCharge' return type */
export type IRemoveHourlyLabourChargeResult = void;

/** 'RemoveHourlyLabourCharge' query type */
export interface IRemoveHourlyLabourChargeQuery {
  params: IRemoveHourlyLabourChargeParams;
  result: IRemoveHourlyLabourChargeResult;
}

const removeHourlyLabourChargeIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":61,"b":73}]}],"statement":"DELETE\nFROM \"HourlyLabourCharge\" hl\nWHERE hl.\"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "HourlyLabourCharge" hl
 * WHERE hl."workOrderId" = :workOrderId!
 * ```
 */
export const removeHourlyLabourCharge = new PreparedQuery<IRemoveHourlyLabourChargeParams,IRemoveHourlyLabourChargeResult>(removeHourlyLabourChargeIR);


/** 'RemoveFixedPriceLabourCharge' parameters type */
export interface IRemoveFixedPriceLabourChargeParams {
  workOrderId: number;
}

/** 'RemoveFixedPriceLabourCharge' return type */
export type IRemoveFixedPriceLabourChargeResult = void;

/** 'RemoveFixedPriceLabourCharge' query type */
export interface IRemoveFixedPriceLabourChargeQuery {
  params: IRemoveFixedPriceLabourChargeParams;
  result: IRemoveFixedPriceLabourChargeResult;
}

const removeFixedPriceLabourChargeIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":67,"b":79}]}],"statement":"DELETE\nFROM \"FixedPriceLabourCharge\" fpl\nWHERE fpl.\"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "FixedPriceLabourCharge" fpl
 * WHERE fpl."workOrderId" = :workOrderId!
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
  name: string;
  rate: string;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
  workOrderItemUuid: string | null;
}

/** 'GetHourlyLabourCharges' query type */
export interface IGetHourlyLabourChargesQuery {
  params: IGetHourlyLabourChargesParams;
  result: IGetHourlyLabourChargesResult;
}

const getHourlyLabourChargesIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":57,"b":69}]}],"statement":"SELECT *\nFROM \"HourlyLabourCharge\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "HourlyLabourCharge"
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
  createdAt: Date;
  employeeId: string | null;
  name: string;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
  workOrderItemUuid: string | null;
}

/** 'GetFixedPriceLabourCharges' query type */
export interface IGetFixedPriceLabourChargesQuery {
  params: IGetFixedPriceLabourChargesParams;
  result: IGetFixedPriceLabourChargesResult;
}

const getFixedPriceLabourChargesIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":61,"b":73}]}],"statement":"SELECT *\nFROM \"FixedPriceLabourCharge\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "FixedPriceLabourCharge"
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
  name: string;
  rate: string;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
  workOrderItemUuid: string | null;
}

/** 'GetHourlyLabourChargesByUuids' query type */
export interface IGetHourlyLabourChargesByUuidsQuery {
  params: IGetHourlyLabourChargesByUuidsParams;
  result: IGetHourlyLabourChargesByUuidsResult;
}

const getHourlyLabourChargesByUuidsIR: any = {"usedParamSet":{"uuids":true,"workOrderId":true},"params":[{"name":"uuids","required":true,"transform":{"type":"array_spread"},"locs":[{"a":49,"b":55}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":79,"b":91}]}],"statement":"SELECT *\nFROM \"HourlyLabourCharge\"\nWHERE uuid IN :uuids!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "HourlyLabourCharge"
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
  createdAt: Date;
  employeeId: string | null;
  name: string;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
  workOrderItemUuid: string | null;
}

/** 'GetFixedPriceLabourChargesByUuids' query type */
export interface IGetFixedPriceLabourChargesByUuidsQuery {
  params: IGetFixedPriceLabourChargesByUuidsParams;
  result: IGetFixedPriceLabourChargesByUuidsResult;
}

const getFixedPriceLabourChargesByUuidsIR: any = {"usedParamSet":{"uuids":true,"workOrderId":true},"params":[{"name":"uuids","required":true,"transform":{"type":"array_spread"},"locs":[{"a":53,"b":59}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":83,"b":95}]}],"statement":"SELECT *\nFROM \"FixedPriceLabourCharge\"\nWHERE uuid IN :uuids!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "FixedPriceLabourCharge"
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

const setHourlyLabourChargeShopifyOrderLineItemIdIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true,"uuid":true,"workOrderId":true},"params":[{"name":"shopifyOrderLineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":59,"b":82}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":97,"b":102}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":126,"b":138}]}],"statement":"UPDATE \"HourlyLabourCharge\"\nSET \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId!\nWHERE uuid = :uuid!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "HourlyLabourCharge"
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

const setFixedPriceLabourChargeShopifyOrderLineItemIdIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true,"uuid":true,"workOrderId":true},"params":[{"name":"shopifyOrderLineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":63,"b":86}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":101,"b":106}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":130,"b":142}]}],"statement":"UPDATE \"FixedPriceLabourCharge\"\nSET \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId!\nWHERE uuid = :uuid!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "FixedPriceLabourCharge"
 * SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
 * WHERE uuid = :uuid!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const setFixedPriceLabourChargeShopifyOrderLineItemId = new PreparedQuery<ISetFixedPriceLabourChargeShopifyOrderLineItemIdParams,ISetFixedPriceLabourChargeShopifyOrderLineItemIdResult>(setFixedPriceLabourChargeShopifyOrderLineItemIdIR);


