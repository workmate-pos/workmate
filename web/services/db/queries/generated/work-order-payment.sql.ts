/** Types generated for queries found in "services/db/queries/work-order-payment.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type PaymentType = 'BALANCE' | 'DEPOSIT';

/** 'Get' parameters type */
export interface IGetParams {
  workOrderId: number;
}

/** 'Get' return type */
export interface IGetResult {
  amount: number;
  id: number;
  orderId: string;
  type: PaymentType;
  workOrderId: number;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":55,"b":67}]}],"statement":"SELECT *\nFROM \"WorkOrderPayment\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderPayment"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'Insert' parameters type */
export interface IInsertParams {
  amount: number;
  orderId: string;
  type: PaymentType;
  workOrderId: number;
}

/** 'Insert' return type */
export interface IInsertResult {
  amount: number;
  id: number;
  orderId: string;
  type: PaymentType;
  workOrderId: number;
}

/** 'Insert' query type */
export interface IInsertQuery {
  params: IInsertParams;
  result: IInsertResult;
}

const insertIR: any = {"usedParamSet":{"workOrderId":true,"orderId":true,"type":true,"amount":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":80,"b":92}]},{"name":"orderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":103}]},{"name":"type","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":111}]},{"name":"amount","required":true,"transform":{"type":"scalar"},"locs":[{"a":114,"b":121}]}],"statement":"INSERT INTO \"WorkOrderPayment\" (\"workOrderId\", \"orderId\", type, amount)\nVALUES (:workOrderId!, :orderId!, :type!, :amount!)\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderPayment" ("workOrderId", "orderId", type, amount)
 * VALUES (:workOrderId!, :orderId!, :type!, :amount!)
 * RETURNING *
 * ```
 */
export const insert = new PreparedQuery<IInsertParams,IInsertResult>(insertIR);


