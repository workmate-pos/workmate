/** Types generated for queries found in "services/db/queries/employee.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type PermissionNode = 'read_app_plan' | 'read_employees' | 'read_settings' | 'read_work_orders' | 'write_app_plan' | 'write_employees' | 'write_settings' | 'write_work_orders';

export type PermissionNodeArray = (PermissionNode)[];

/** 'GetMany' parameters type */
export interface IGetManyParams {
  employeeIds: readonly (string)[];
  shop: string;
}

/** 'GetMany' return type */
export interface IGetManyResult {
  employeeId: string;
  permissions: PermissionNodeArray | null;
  rate: string | null;
  shop: string;
  superuser: boolean;
}

/** 'GetMany' query type */
export interface IGetManyQuery {
  params: IGetManyParams;
  result: IGetManyResult;
}

const getManyIR: any = {"usedParamSet":{"shop":true,"employeeIds":true},"params":[{"name":"employeeIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":65,"b":77}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":38,"b":43}]}],"statement":"SELECT *\nFROM \"Employee\"\nWHERE shop = :shop!\nAND \"employeeId\" IN :employeeIds!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Employee"
 * WHERE shop = :shop!
 * AND "employeeId" IN :employeeIds!
 * ```
 */
export const getMany = new PreparedQuery<IGetManyParams,IGetManyResult>(getManyIR);


/** 'UpsertMany' parameters type */
export interface IUpsertManyParams {
  employees: readonly ({
    employeeId: string,
    superuser: boolean,
    permissions: PermissionNodeArray,
    rate: string | null | void
  })[];
  shop: string;
}

/** 'UpsertMany' return type */
export interface IUpsertManyResult {
  employeeId: string;
  permissions: PermissionNodeArray | null;
  rate: string | null;
  shop: string;
  superuser: boolean;
}

/** 'UpsertMany' query type */
export interface IUpsertManyQuery {
  params: IUpsertManyParams;
  result: IUpsertManyResult;
}

const upsertManyIR: any = {"usedParamSet":{"shop":true,"employees":true},"params":[{"name":"employees","required":true,"transform":{"type":"pick_array_spread","keys":[{"name":"employeeId","required":true},{"name":"superuser","required":true},{"name":"permissions","required":true},{"name":"rate","required":false}]},"locs":[{"a":151,"b":161}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":41,"b":46}]}],"statement":"WITH Input AS (\n    SELECT \"employeeId\", :shop! AS shop, rate, superuser, permissions\n    FROM (VALUES ('', FALSE, ARRAY[] :: \"PermissionNode\"[], ''), :employees! OFFSET 1) AS t (\"employeeId\", superuser, permissions, rate)\n)\nINSERT INTO \"Employee\" (\"employeeId\", shop, superuser, permissions, rate)\nSELECT \"employeeId\", shop, superuser, permissions, rate\nFROM Input\nON CONFLICT (\"employeeId\", \"shop\")\nDO UPDATE SET \"rate\" = EXCLUDED.\"rate\",\n              \"superuser\" = EXCLUDED.\"superuser\",\n              \"permissions\" = EXCLUDED.\"permissions\"\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * WITH Input AS (
 *     SELECT "employeeId", :shop! AS shop, rate, superuser, permissions
 *     FROM (VALUES ('', FALSE, ARRAY[] :: "PermissionNode"[], ''), :employees! OFFSET 1) AS t ("employeeId", superuser, permissions, rate)
 * )
 * INSERT INTO "Employee" ("employeeId", shop, superuser, permissions, rate)
 * SELECT "employeeId", shop, superuser, permissions, rate
 * FROM Input
 * ON CONFLICT ("employeeId", "shop")
 * DO UPDATE SET "rate" = EXCLUDED."rate",
 *               "superuser" = EXCLUDED."superuser",
 *               "permissions" = EXCLUDED."permissions"
 * RETURNING *
 * ```
 */
export const upsertMany = new PreparedQuery<IUpsertManyParams,IUpsertManyResult>(upsertManyIR);


/** 'DeleteMany' parameters type */
export interface IDeleteManyParams {
  employeeIds: readonly (string)[];
  shop: string;
}

/** 'DeleteMany' return type */
export type IDeleteManyResult = void;

/** 'DeleteMany' query type */
export interface IDeleteManyQuery {
  params: IDeleteManyParams;
  result: IDeleteManyResult;
}

const deleteManyIR: any = {"usedParamSet":{"shop":true,"employeeIds":true},"params":[{"name":"employeeIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":63,"b":75}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":36,"b":41}]}],"statement":"DELETE FROM \"Employee\"\nWHERE shop = :shop!\nAND \"employeeId\" IN :employeeIds!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM "Employee"
 * WHERE shop = :shop!
 * AND "employeeId" IN :employeeIds!
 * ```
 */
export const deleteMany = new PreparedQuery<IDeleteManyParams,IDeleteManyResult>(deleteManyIR);


