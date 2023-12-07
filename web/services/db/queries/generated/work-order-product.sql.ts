/** Types generated for queries found in "services/db/queries/work-order-product.sql" */
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

const removeIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":53,"b":65}]}],"statement":"DELETE FROM \"WorkOrderProduct\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM "WorkOrderProduct"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const remove = new PreparedQuery<IRemoveParams,IRemoveResult>(removeIR);


/** 'Get' parameters type */
export interface IGetParams {
  workOrderId: number;
}

/** 'Get' return type */
export interface IGetResult {
  id: number;
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  workOrderId: number;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":55,"b":67}]}],"statement":"SELECT *\nFROM \"WorkOrderProduct\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderProduct"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'Insert' parameters type */
export interface IInsertParams {
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  workOrderId: number;
}

/** 'Insert' return type */
export type IInsertResult = void;

/** 'Insert' query type */
export interface IInsertQuery {
  params: IInsertParams;
  result: IInsertResult;
}

const insertIR: any = {"usedParamSet":{"productVariantId":true,"unitPrice":true,"quantity":true,"workOrderId":true},"params":[{"name":"productVariantId","required":true,"transform":{"type":"scalar"},"locs":[{"a":98,"b":115}]},{"name":"unitPrice","required":true,"transform":{"type":"scalar"},"locs":[{"a":118,"b":128}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":131,"b":140}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":155}]}],"statement":"INSERT INTO \"WorkOrderProduct\" (\"productVariantId\", \"unitPrice\", quantity, \"workOrderId\")\nVALUES (:productVariantId!, :unitPrice!, :quantity!, :workOrderId!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderProduct" ("productVariantId", "unitPrice", quantity, "workOrderId")
 * VALUES (:productVariantId!, :unitPrice!, :quantity!, :workOrderId!)
 * ```
 */
export const insert = new PreparedQuery<IInsertParams,IInsertResult>(insertIR);


