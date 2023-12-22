/** Types generated for queries found in "services/db/queries/employee-assignment.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetMany' parameters type */
export interface IGetManyParams {
  name: string;
  shop: string;
}

/** 'GetMany' return type */
export interface IGetManyResult {
  employeeId: string;
  hours: number;
  id: number;
  lineItemUuid: string | null;
  productVariantId: string | null;
  rate: number;
  workOrderId: number;
}

/** 'GetMany' query type */
export interface IGetManyQuery {
  params: IGetManyParams;
  result: IGetManyResult;
}

const getManyIR: any = {"usedParamSet":{"shop":true,"name":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":111,"b":116}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":132,"b":137}]}],"statement":"SELECT ea.*\nFROM \"EmployeeAssignment\" ea\nINNER JOIN \"WorkOrder\" wo ON ea.\"workOrderId\" = wo.id\nWHERE wo.shop = :shop!\nAND wo.name = :name!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT ea.*
 * FROM "EmployeeAssignment" ea
 * INNER JOIN "WorkOrder" wo ON ea."workOrderId" = wo.id
 * WHERE wo.shop = :shop!
 * AND wo.name = :name!
 * ```
 */
export const getMany = new PreparedQuery<IGetManyParams,IGetManyResult>(getManyIR);


/** 'UpsertMany' parameters type */
export interface IUpsertManyParams {
  assignments: readonly ({
    productVariantId: string | null | void,
    lineItemUuid: string | null | void,
    employeeId: string | null | void,
    rate: number | null | void,
    hours: number | null | void
  })[];
  name: string;
  shop: string;
}

/** 'UpsertMany' return type */
export type IUpsertManyResult = void;

/** 'UpsertMany' query type */
export interface IUpsertManyQuery {
  params: IUpsertManyParams;
  result: IUpsertManyResult;
}

const upsertManyIR: any = {"usedParamSet":{"shop":true,"name":true,"assignments":true},"params":[{"name":"assignments","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"productVariantId","required":false},{"name":"lineItemUuid","required":false},{"name":"employeeId","required":false},{"name":"rate","required":false},{"name":"hours","required":false}]},"locs":[{"a":288,"b":299}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":226,"b":231}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":247,"b":252}]}],"statement":"INSERT INTO \"EmployeeAssignment\" (\"productVariantId\", \"lineItemUuid\", \"employeeId\", rate, hours, \"workOrderId\")\nSELECT productVariantId, lineItemUuid, employeeId, rate, hours, (SELECT wo.id FROM \"WorkOrder\" wo WHERE wo.shop = :shop! AND wo.name = :name!)\nFROM (VALUES ('', '', '', 0, 0), :assignments OFFSET 1) as t (productVariantId, lineItemUuid, employeeId, rate, hours)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "EmployeeAssignment" ("productVariantId", "lineItemUuid", "employeeId", rate, hours, "workOrderId")
 * SELECT productVariantId, lineItemUuid, employeeId, rate, hours, (SELECT wo.id FROM "WorkOrder" wo WHERE wo.shop = :shop! AND wo.name = :name!)
 * FROM (VALUES ('', '', '', 0, 0), :assignments OFFSET 1) as t (productVariantId, lineItemUuid, employeeId, rate, hours)
 * ```
 */
export const upsertMany = new PreparedQuery<IUpsertManyParams,IUpsertManyResult>(upsertManyIR);


/** 'Remove' parameters type */
export interface IRemoveParams {
  name?: string | null | void;
  shop?: string | null | void;
}

/** 'Remove' return type */
export type IRemoveResult = void;

/** 'Remove' query type */
export interface IRemoveQuery {
  params: IRemoveParams;
  result: IRemoveResult;
}

const removeIR: any = {"usedParamSet":{"shop":true,"name":true},"params":[{"name":"shop","required":false,"transform":{"type":"scalar"},"locs":[{"a":73,"b":77}]},{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":93,"b":97}]}],"statement":"DELETE FROM \"EmployeeAssignment\" ea\nUSING \"WorkOrder\" wo\nWHERE wo.shop = :shop\nAND wo.name = :name\nAND ea.\"workOrderId\" = wo.id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM "EmployeeAssignment" ea
 * USING "WorkOrder" wo
 * WHERE wo.shop = :shop
 * AND wo.name = :name
 * AND ea."workOrderId" = wo.id
 * ```
 */
export const remove = new PreparedQuery<IRemoveParams,IRemoveResult>(removeIR);


