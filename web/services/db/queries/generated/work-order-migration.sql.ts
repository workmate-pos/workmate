/** Types generated for queries found in "services/db/queries/work-order-migration.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetAll' parameters type */
export type IGetAllParams = void;

/** 'GetAll' return type */
export interface IGetAllResult {
  createdAt: Date;
  customerId: string;
  derivedFromOrderId: string | null;
  draftOrderId: string | null;
  dueDate: Date;
  id: number;
  name: string;
  orderId: string | null;
  shop: string;
  status: string;
}

/** 'GetAll' query type */
export interface IGetAllQuery {
  params: IGetAllParams;
  result: IGetAllResult;
}

const getAllIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT *\nFROM \"WorkOrder\""};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrder"
 * ```
 */
export const getAll = new PreparedQuery<IGetAllParams,IGetAllResult>(getAllIR);


/** 'GetHourlyLabours' parameters type */
export interface IGetHourlyLaboursParams {
  workOrderId: number;
}

/** 'GetHourlyLabours' return type */
export interface IGetHourlyLaboursResult {
  employeeId: string | null;
  hours: string;
  id: number;
  lineItemUuid: string | null;
  name: string;
  productVariantId: string | null;
  rate: string;
  workOrderId: number;
}

/** 'GetHourlyLabours' query type */
export interface IGetHourlyLaboursQuery {
  params: IGetHourlyLaboursParams;
  result: IGetHourlyLaboursResult;
}

const getHourlyLaboursIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":51,"b":63}]}],"statement":"SELECT *\nFROM \"HourlyLabour\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "HourlyLabour"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getHourlyLabours = new PreparedQuery<IGetHourlyLaboursParams,IGetHourlyLaboursResult>(getHourlyLaboursIR);


/** 'GetFixedPriceLabours' parameters type */
export interface IGetFixedPriceLaboursParams {
  workOrderId: number;
}

/** 'GetFixedPriceLabours' return type */
export interface IGetFixedPriceLaboursResult {
  amount: string;
  employeeId: string | null;
  id: number;
  lineItemUuid: string | null;
  name: string;
  productVariantId: string | null;
  workOrderId: number;
}

/** 'GetFixedPriceLabours' query type */
export interface IGetFixedPriceLaboursQuery {
  params: IGetFixedPriceLaboursParams;
  result: IGetFixedPriceLaboursResult;
}

const getFixedPriceLaboursIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":55,"b":67}]}],"statement":"SELECT *\nFROM \"FixedPriceLabour\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "FixedPriceLabour"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getFixedPriceLabours = new PreparedQuery<IGetFixedPriceLaboursParams,IGetFixedPriceLaboursResult>(getFixedPriceLaboursIR);


/** 'RemoveWorkOrder' parameters type */
export interface IRemoveWorkOrderParams {
  workOrderId: number;
}

/** 'RemoveWorkOrder' return type */
export type IRemoveWorkOrderResult = void;

/** 'RemoveWorkOrder' query type */
export interface IRemoveWorkOrderQuery {
  params: IRemoveWorkOrderParams;
  result: IRemoveWorkOrderResult;
}

const removeWorkOrderIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":35,"b":47}]}],"statement":"DELETE\nFROM \"WorkOrder\"\nWHERE id = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "WorkOrder"
 * WHERE id = :workOrderId!
 * ```
 */
export const removeWorkOrder = new PreparedQuery<IRemoveWorkOrderParams,IRemoveWorkOrderResult>(removeWorkOrderIR);


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

const removeHourlyLabourIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":49,"b":61}]}],"statement":"DELETE\nFROM \"HourlyLabour\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "HourlyLabour"
 * WHERE "workOrderId" = :workOrderId!
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

const removeFixedPriceLabourIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":53,"b":65}]}],"statement":"DELETE\nFROM \"FixedPriceLabour\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "FixedPriceLabour"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const removeFixedPriceLabour = new PreparedQuery<IRemoveFixedPriceLabourParams,IRemoveFixedPriceLabourResult>(removeFixedPriceLabourIR);


