/** Types generated for queries found in "services/db/queries/work-order-employee-assignment.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'Insert' parameters type */
export interface IInsertParams {
  employeeId: string;
  workOrderId: number;
}

/** 'Insert' return type */
export type IInsertResult = void;

/** 'Insert' query type */
export interface IInsertQuery {
  params: IInsertParams;
  result: IInsertResult;
}

const insertIR: any = {"usedParamSet":{"workOrderId":true,"employeeId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":71,"b":83}]},{"name":"employeeId","required":true,"transform":{"type":"scalar"},"locs":[{"a":86,"b":97}]}],"statement":"INSERT INTO \"EmployeeAssignment\" (\"workOrderId\", \"employeeId\")\nVALUES (:workOrderId!, :employeeId!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "EmployeeAssignment" ("workOrderId", "employeeId")
 * VALUES (:workOrderId!, :employeeId!)
 * ```
 */
export const insert = new PreparedQuery<IInsertParams,IInsertResult>(insertIR);


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

const removeIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":55,"b":67}]}],"statement":"DELETE FROM \"EmployeeAssignment\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM "EmployeeAssignment"
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
  employeeId: string;
  id: number;
  workOrderId: number;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":57,"b":69}]}],"statement":"SELECT *\nFROM \"EmployeeAssignment\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "EmployeeAssignment"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


