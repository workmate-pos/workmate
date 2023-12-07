/** Types generated for queries found in "services/db/queries/work-order-service.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'Remove' parameters type */
export interface IRemoveParams {
  workOrderId: number;
}

/** 'Remove' return type */
export type IRemoveResult = void;

/** 'Remove' query type */
export interface IRemoveQuery {
  params: IRemoveParams;
  result: IRemoveResult;
}

const removeIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":53,"b":65}]}],"statement":"DELETE FROM \"WorkOrderService\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM "WorkOrderService"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const remove = new PreparedQuery<IRemoveParams,IRemoveResult>(removeIR);


/** 'Insert' parameters type */
export interface IInsertParams {
  basePrice: number;
  productVariantId: string;
  workOrderId: number;
}

/** 'Insert' return type */
export interface IInsertResult {
  basePrice: number;
  id: number;
  productVariantId: string;
  workOrderId: number;
}

/** 'Insert' query type */
export interface IInsertQuery {
  params: IInsertParams;
  result: IInsertResult;
}

const insertIR: any = {"usedParamSet":{"productVariantId":true,"basePrice":true,"workOrderId":true},"params":[{"name":"productVariantId","required":true,"transform":{"type":"scalar"},"locs":[{"a":88,"b":105}]},{"name":"basePrice","required":true,"transform":{"type":"scalar"},"locs":[{"a":108,"b":118}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":121,"b":133}]}],"statement":"INSERT INTO \"WorkOrderService\" (\"productVariantId\", \"basePrice\", \"workOrderId\")\nVALUES (:productVariantId!, :basePrice!, :workOrderId!)\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderService" ("productVariantId", "basePrice", "workOrderId")
 * VALUES (:productVariantId!, :basePrice!, :workOrderId!)
 * RETURNING *
 * ```
 */
export const insert = new PreparedQuery<IInsertParams,IInsertResult>(insertIR);


/** 'Get' parameters type */
export interface IGetParams {
  workOrderId: number;
}

/** 'Get' return type */
export interface IGetResult {
  basePrice: number;
  id: number;
  productVariantId: string;
  workOrderId: number;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":55,"b":67}]}],"statement":"SELECT *\nFROM \"WorkOrderService\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderService"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


