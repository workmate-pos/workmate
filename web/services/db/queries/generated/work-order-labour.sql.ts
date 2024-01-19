/** Types generated for queries found in "services/db/queries/work-order-labour.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'InsertHourlyLabour' parameters type */
export interface IInsertHourlyLabourParams {
  employeeId?: string | null | void;
  hours?: number | null | void;
  lineItemUuid?: string | null | void;
  name: string;
  productVariantId?: string | null | void;
  rate: number;
  workOrderId: number;
}

/** 'InsertHourlyLabour' return type */
export type IInsertHourlyLabourResult = void;

/** 'InsertHourlyLabour' query type */
export interface IInsertHourlyLabourQuery {
  params: IInsertHourlyLabourParams;
  result: IInsertHourlyLabourResult;
}

const insertHourlyLabourIR: any = {"usedParamSet":{"workOrderId":true,"lineItemUuid":true,"productVariantId":true,"employeeId":true,"name":true,"rate":true,"hours":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":120,"b":132}]},{"name":"lineItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":135,"b":147}]},{"name":"productVariantId","required":false,"transform":{"type":"scalar"},"locs":[{"a":150,"b":166}]},{"name":"employeeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":169,"b":179}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":182,"b":187}]},{"name":"rate","required":true,"transform":{"type":"scalar"},"locs":[{"a":190,"b":195}]},{"name":"hours","required":false,"transform":{"type":"scalar"},"locs":[{"a":198,"b":203}]}],"statement":"INSERT INTO \"HourlyLabour\" (\"workOrderId\", \"lineItemUuid\", \"productVariantId\", \"employeeId\", name, rate, hours)\nVALUES (:workOrderId!, :lineItemUuid, :productVariantId, :employeeId, :name!, :rate!, :hours)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "HourlyLabour" ("workOrderId", "lineItemUuid", "productVariantId", "employeeId", name, rate, hours)
 * VALUES (:workOrderId!, :lineItemUuid, :productVariantId, :employeeId, :name!, :rate!, :hours)
 * ```
 */
export const insertHourlyLabour = new PreparedQuery<IInsertHourlyLabourParams,IInsertHourlyLabourResult>(insertHourlyLabourIR);


/** 'InsertFixedPriceLabour' parameters type */
export interface IInsertFixedPriceLabourParams {
  amount: number;
  employeeId?: string | null | void;
  lineItemUuid?: string | null | void;
  name: string;
  productVariantId?: string | null | void;
  workOrderId: number;
}

/** 'InsertFixedPriceLabour' return type */
export type IInsertFixedPriceLabourResult = void;

/** 'InsertFixedPriceLabour' query type */
export interface IInsertFixedPriceLabourQuery {
  params: IInsertFixedPriceLabourParams;
  result: IInsertFixedPriceLabourResult;
}

const insertFixedPriceLabourIR: any = {"usedParamSet":{"workOrderId":true,"lineItemUuid":true,"productVariantId":true,"employeeId":true,"name":true,"amount":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":119,"b":131}]},{"name":"lineItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":134,"b":146}]},{"name":"productVariantId","required":false,"transform":{"type":"scalar"},"locs":[{"a":149,"b":165}]},{"name":"employeeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":168,"b":178}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":181,"b":186}]},{"name":"amount","required":true,"transform":{"type":"scalar"},"locs":[{"a":189,"b":196}]}],"statement":"INSERT INTO \"FixedPriceLabour\" (\"workOrderId\", \"lineItemUuid\", \"productVariantId\", \"employeeId\", name, amount)\nVALUES (:workOrderId!, :lineItemUuid, :productVariantId, :employeeId, :name!, :amount!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "FixedPriceLabour" ("workOrderId", "lineItemUuid", "productVariantId", "employeeId", name, amount)
 * VALUES (:workOrderId!, :lineItemUuid, :productVariantId, :employeeId, :name!, :amount!)
 * ```
 */
export const insertFixedPriceLabour = new PreparedQuery<IInsertFixedPriceLabourParams,IInsertFixedPriceLabourResult>(insertFixedPriceLabourIR);


/** 'RemoveHourlyLabour' parameters type */
export interface IRemoveHourlyLabourParams {
  workOrderId: number;
}

/** 'RemoveHourlyLabour' return type */
export type IRemoveHourlyLabourResult = void;

/** 'RemoveHourlyLabour' query type */
export interface IRemoveHourlyLabourQuery {
  params: IRemoveHourlyLabourParams;
  result: IRemoveHourlyLabourResult;
}

const removeHourlyLabourIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":55,"b":67}]}],"statement":"DELETE FROM \"HourlyLabour\" hl\nWHERE hl.\"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM "HourlyLabour" hl
 * WHERE hl."workOrderId" = :workOrderId!
 * ```
 */
export const removeHourlyLabour = new PreparedQuery<IRemoveHourlyLabourParams,IRemoveHourlyLabourResult>(removeHourlyLabourIR);


/** 'RemoveFixedPriceLabour' parameters type */
export interface IRemoveFixedPriceLabourParams {
  workOrderId: number;
}

/** 'RemoveFixedPriceLabour' return type */
export type IRemoveFixedPriceLabourResult = void;

/** 'RemoveFixedPriceLabour' query type */
export interface IRemoveFixedPriceLabourQuery {
  params: IRemoveFixedPriceLabourParams;
  result: IRemoveFixedPriceLabourResult;
}

const removeFixedPriceLabourIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":61,"b":73}]}],"statement":"DELETE FROM \"FixedPriceLabour\" fpl\nWHERE fpl.\"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM "FixedPriceLabour" fpl
 * WHERE fpl."workOrderId" = :workOrderId!
 * ```
 */
export const removeFixedPriceLabour = new PreparedQuery<IRemoveFixedPriceLabourParams,IRemoveFixedPriceLabourResult>(removeFixedPriceLabourIR);


