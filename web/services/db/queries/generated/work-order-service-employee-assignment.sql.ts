/** Types generated for queries found in "services/db/queries/work-order-service-employee-assignment.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'RemoveByWorkOrder' parameters type */
export interface IRemoveByWorkOrderParams {
  workOrderId: number;
}

/** 'RemoveByWorkOrder' return type */
export type IRemoveByWorkOrderResult = void;

/** 'RemoveByWorkOrder' query type */
export interface IRemoveByWorkOrderQuery {
  params: IRemoveByWorkOrderParams;
  result: IRemoveByWorkOrderResult;
}

const removeByWorkOrderIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":118}]}],"statement":"DELETE FROM \"WorkOrderServiceEmployeeAssignment\" wosea\nUSING \"WorkOrderService\" wos\nWHERE \"workOrderId\" = :workOrderId!\nAND wos.id = wosea.\"workOrderServiceId\""};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM "WorkOrderServiceEmployeeAssignment" wosea
 * USING "WorkOrderService" wos
 * WHERE "workOrderId" = :workOrderId!
 * AND wos.id = wosea."workOrderServiceId"
 * ```
 */
export const removeByWorkOrder = new PreparedQuery<IRemoveByWorkOrderParams,IRemoveByWorkOrderResult>(removeByWorkOrderIR);


/** 'Insert' parameters type */
export interface IInsertParams {
  employeeId: string;
  employeeRate: number;
  hours: number;
  workOrderServiceId: number;
}

/** 'Insert' return type */
export type IInsertResult = void;

/** 'Insert' query type */
export interface IInsertQuery {
  params: IInsertParams;
  result: IInsertResult;
}

const insertIR: any = {"usedParamSet":{"employeeId":true,"employeeRate":true,"hours":true,"workOrderServiceId":true},"params":[{"name":"employeeId","required":true,"transform":{"type":"scalar"},"locs":[{"a":117,"b":128}]},{"name":"employeeRate","required":true,"transform":{"type":"scalar"},"locs":[{"a":131,"b":144}]},{"name":"hours","required":true,"transform":{"type":"scalar"},"locs":[{"a":147,"b":153}]},{"name":"workOrderServiceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":156,"b":175}]}],"statement":"INSERT INTO \"WorkOrderServiceEmployeeAssignment\" (\"employeeId\", \"employeeRate\", hours, \"workOrderServiceId\")\nVALUES (:employeeId!, :employeeRate!, :hours!, :workOrderServiceId!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderServiceEmployeeAssignment" ("employeeId", "employeeRate", hours, "workOrderServiceId")
 * VALUES (:employeeId!, :employeeRate!, :hours!, :workOrderServiceId!)
 * ```
 */
export const insert = new PreparedQuery<IInsertParams,IInsertResult>(insertIR);


/** 'Get' parameters type */
export interface IGetParams {
  workOrderServiceId: number;
}

/** 'Get' return type */
export interface IGetResult {
  employeeId: string;
  employeeRate: number;
  hours: number;
  id: number;
  workOrderServiceId: number;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"workOrderServiceId":true},"params":[{"name":"workOrderServiceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":80,"b":99}]}],"statement":"SELECT *\nFROM \"WorkOrderServiceEmployeeAssignment\"\nWHERE \"workOrderServiceId\" = :workOrderServiceId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderServiceEmployeeAssignment"
 * WHERE "workOrderServiceId" = :workOrderServiceId!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


