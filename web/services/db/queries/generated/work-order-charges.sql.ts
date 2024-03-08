/** Types generated for queries found in "services/db/queries/work-order-charges.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'UpsertHourlyLabourCharge' parameters type */
export interface IUpsertHourlyLabourChargeParams {
  employeeId?: string | null | void;
  hours: string;
  name: string;
  rate: string;
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

const upsertHourlyLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"employeeId":true,"name":true,"rate":true,"hours":true,"workOrderItemUuid":true,"shopifyOrderLineItemId":true,"uuid":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":186,"b":198}]},{"name":"employeeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":201,"b":211},{"a":371,"b":381}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":214,"b":219},{"a":417,"b":422}]},{"name":"rate","required":true,"transform":{"type":"scalar"},"locs":[{"a":222,"b":227},{"a":458,"b":463}]},{"name":"hours","required":true,"transform":{"type":"scalar"},"locs":[{"a":230,"b":236},{"a":499,"b":505}]},{"name":"workOrderItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":239,"b":256},{"a":541,"b":558}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":259,"b":281},{"a":594,"b":616}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":284,"b":289}]}],"statement":"INSERT INTO \"WorkOrderHourlyLabourCharge\" (\"workOrderId\", \"employeeId\", name, rate, hours, \"workOrderItemUuid\",\n                                  \"shopifyOrderLineItemId\", uuid)\nVALUES (:workOrderId!, :employeeId, :name!, :rate!, :hours!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!)\nON CONFLICT (\"workOrderId\", uuid)\n  DO UPDATE\n  SET \"employeeId\"             = :employeeId,\n      name                     = :name!,\n      rate                     = :rate!,\n      hours                    = :hours!,\n      \"workOrderItemUuid\"      = :workOrderItemUuid,\n      \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderHourlyLabourCharge" ("workOrderId", "employeeId", name, rate, hours, "workOrderItemUuid",
 *                                   "shopifyOrderLineItemId", uuid)
 * VALUES (:workOrderId!, :employeeId, :name!, :rate!, :hours!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!)
 * ON CONFLICT ("workOrderId", uuid)
 *   DO UPDATE
 *   SET "employeeId"             = :employeeId,
 *       name                     = :name!,
 *       rate                     = :rate!,
 *       hours                    = :hours!,
 *       "workOrderItemUuid"      = :workOrderItemUuid,
 *       "shopifyOrderLineItemId" = :shopifyOrderLineItemId
 * ```
 */
export const upsertHourlyLabourCharge = new PreparedQuery<IUpsertHourlyLabourChargeParams,IUpsertHourlyLabourChargeResult>(upsertHourlyLabourChargeIR);


/** 'UpsertFixedPriceLabourCharge' parameters type */
export interface IUpsertFixedPriceLabourChargeParams {
  amount: string;
  employeeId?: string | null | void;
  name: string;
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

const upsertFixedPriceLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"employeeId":true,"name":true,"amount":true,"workOrderItemUuid":true,"shopifyOrderLineItemId":true,"uuid":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":189,"b":201}]},{"name":"employeeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":204,"b":214},{"a":367,"b":377}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":217,"b":222},{"a":413,"b":418}]},{"name":"amount","required":true,"transform":{"type":"scalar"},"locs":[{"a":225,"b":232},{"a":454,"b":461}]},{"name":"workOrderItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":235,"b":252},{"a":497,"b":514}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":255,"b":277},{"a":550,"b":572}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":280,"b":285}]}],"statement":"INSERT INTO \"WorkOrderFixedPriceLabourCharge\" (\"workOrderId\", \"employeeId\", name, amount, \"workOrderItemUuid\",\n                                      \"shopifyOrderLineItemId\", uuid)\nVALUES (:workOrderId!, :employeeId, :name!, :amount!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!)\nON CONFLICT (\"workOrderId\", uuid)\n  DO UPDATE\n  SET \"employeeId\"             = :employeeId,\n      name                     = :name!,\n      amount                   = :amount!,\n      \"workOrderItemUuid\"      = :workOrderItemUuid,\n      \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderFixedPriceLabourCharge" ("workOrderId", "employeeId", name, amount, "workOrderItemUuid",
 *                                       "shopifyOrderLineItemId", uuid)
 * VALUES (:workOrderId!, :employeeId, :name!, :amount!, :workOrderItemUuid, :shopifyOrderLineItemId, :uuid!)
 * ON CONFLICT ("workOrderId", uuid)
 *   DO UPDATE
 *   SET "employeeId"             = :employeeId,
 *       name                     = :name!,
 *       amount                   = :amount!,
 *       "workOrderItemUuid"      = :workOrderItemUuid,
 *       "shopifyOrderLineItemId" = :shopifyOrderLineItemId
 * ```
 */
export const upsertFixedPriceLabourCharge = new PreparedQuery<IUpsertFixedPriceLabourChargeParams,IUpsertFixedPriceLabourChargeResult>(upsertFixedPriceLabourChargeIR);


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


