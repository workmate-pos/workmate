/** Types generated for queries found in "services/db/queries/employee.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'DeleteWorkOrderEmployeeAssignments' parameters type */
export interface IDeleteWorkOrderEmployeeAssignmentsParams {
  workOrderId: number;
}

/** 'DeleteWorkOrderEmployeeAssignments' return type */
export type IDeleteWorkOrderEmployeeAssignmentsResult = void;

/** 'DeleteWorkOrderEmployeeAssignments' query type */
export interface IDeleteWorkOrderEmployeeAssignmentsQuery {
  params: IDeleteWorkOrderEmployeeAssignmentsParams;
  result: IDeleteWorkOrderEmployeeAssignmentsResult;
}

const deleteWorkOrderEmployeeAssignmentsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":61,"b":73}]}],"statement":"DELETE FROM \"EmployeeAssignment\" ea\nWHERE ea.\"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM "EmployeeAssignment" ea
 * WHERE ea."workOrderId" = :workOrderId!
 * ```
 */
export const deleteWorkOrderEmployeeAssignments = new PreparedQuery<IDeleteWorkOrderEmployeeAssignmentsParams,IDeleteWorkOrderEmployeeAssignmentsResult>(deleteWorkOrderEmployeeAssignmentsIR);


/** 'CreateEmployeeAssignment' parameters type */
export interface ICreateEmployeeAssignmentParams {
  employeeId: string;
  workOrderId: number;
}

/** 'CreateEmployeeAssignment' return type */
export interface ICreateEmployeeAssignmentResult {
  employeeId: string;
  id: number;
  workOrderId: number;
}

/** 'CreateEmployeeAssignment' query type */
export interface ICreateEmployeeAssignmentQuery {
  params: ICreateEmployeeAssignmentParams;
  result: ICreateEmployeeAssignmentResult;
}

const createEmployeeAssignmentIR: any = {"usedParamSet":{"employeeId":true,"workOrderId":true},"params":[{"name":"employeeId","required":true,"transform":{"type":"scalar"},"locs":[{"a":71,"b":82}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":85,"b":97}]}],"statement":"INSERT INTO \"EmployeeAssignment\" (\"employeeId\", \"workOrderId\")\nVALUES (:employeeId!, :workOrderId!)\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "EmployeeAssignment" ("employeeId", "workOrderId")
 * VALUES (:employeeId!, :workOrderId!)
 * RETURNING *
 * ```
 */
export const createEmployeeAssignment = new PreparedQuery<ICreateEmployeeAssignmentParams,ICreateEmployeeAssignmentResult>(createEmployeeAssignmentIR);


/** Query 'GetAssignedEmployees' is invalid, so its result is assigned type 'never'.
 *  */
export type IGetAssignedEmployeesResult = never;

/** Query 'GetAssignedEmployees' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IGetAssignedEmployeesParams = never;

const getAssignedEmployeesIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":117,"b":129}]}],"statement":"SELECT e.*\nFROM \"Employee\" e\nINNER JOIN \"EmployeeAssignment\" ea ON ea.\"employeeId\" = e.\"id\"\nWHERE ea.\"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT e.*
 * FROM "Employee" e
 * INNER JOIN "EmployeeAssignment" ea ON ea."employeeId" = e."id"
 * WHERE ea."workOrderId" = :workOrderId!
 * ```
 */
export const getAssignedEmployees = new PreparedQuery<IGetAssignedEmployeesParams,IGetAssignedEmployeesResult>(getAssignedEmployeesIR);


/** Query 'Page' is invalid, so its result is assigned type 'never'.
 *  */
export type IPageResult = never;

/** Query 'Page' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IPageParams = never;

const pageIR: any = {"usedParamSet":{"shop":true,"query":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":38,"b":43}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":73,"b":78}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":114,"b":120}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":129,"b":136}]}],"statement":"SELECT *\nFROM \"Employee\"\nWHERE shop = :shop!\nAND (\n  name ILIKE COALESCE(:query, '%')\n  )\nORDER BY name ASC\nLIMIT :limit!\nOFFSET :offset!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Employee"
 * WHERE shop = :shop!
 * AND (
 *   name ILIKE COALESCE(:query, '%')
 *   )
 * ORDER BY name ASC
 * LIMIT :limit!
 * OFFSET :offset!
 * ```
 */
export const page = new PreparedQuery<IPageParams,IPageResult>(pageIR);


/** Query 'Upsert' is invalid, so its result is assigned type 'never'.
 *  */
export type IUpsertResult = never;

/** Query 'Upsert' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IUpsertParams = never;

const upsertIR: any = {"usedParamSet":{"id":true,"shop":true,"name":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":48,"b":51}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":54,"b":59},{"a":110,"b":115}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":62,"b":67},{"a":127,"b":132}]}],"statement":"INSERT INTO \"Employee\" (id, shop, name)\nVALUES (:id!, :shop!, :name!)\nON CONFLICT (id) DO UPDATE SET\n  shop = :shop!,\n  name = :name!\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "Employee" (id, shop, name)
 * VALUES (:id!, :shop!, :name!)
 * ON CONFLICT (id) DO UPDATE SET
 *   shop = :shop!,
 *   name = :name!
 * RETURNING *
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


