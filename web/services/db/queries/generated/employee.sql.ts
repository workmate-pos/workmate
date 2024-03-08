/** Types generated for queries found in "services/db/queries/employee.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type PermissionNode = 'read_app_plan' | 'read_employees' | 'read_purchase_orders' | 'read_settings' | 'read_work_orders' | 'write_app_plan' | 'write_employees' | 'write_purchase_orders' | 'write_settings' | 'write_work_orders';

export type PermissionNodeArray = (PermissionNode)[];

/** 'GetMany' parameters type */
export interface IGetManyParams {
  employeeIds: readonly (string)[];
}

/** 'GetMany' return type */
export interface IGetManyResult {
  createdAt: Date;
  isShopOwner: boolean;
  name: string;
  permissions: PermissionNodeArray | null;
  rate: string | null;
  shop: string;
  staffMemberId: string;
  superuser: boolean;
  updatedAt: Date;
}

/** 'GetMany' query type */
export interface IGetManyQuery {
  params: IGetManyParams;
  result: IGetManyResult;
}

const getManyIR: any = {"usedParamSet":{"employeeIds":true},"params":[{"name":"employeeIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":50,"b":62}]}],"statement":"SELECT *\nFROM \"Employee\"\nWHERE \"staffMemberId\" IN :employeeIds!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Employee"
 * WHERE "staffMemberId" IN :employeeIds!
 * ```
 */
export const getMany = new PreparedQuery<IGetManyParams,IGetManyResult>(getManyIR);


/** 'UpsertMany' parameters type */
export interface IUpsertManyParams {
  employees: readonly ({
    employeeId: string,
    superuser: boolean,
    permissions: PermissionNodeArray,
    rate: string | null | void,
    isShopOwner: boolean,
    name: string
  })[];
  shop: string;
}

/** 'UpsertMany' return type */
export interface IUpsertManyResult {
  createdAt: Date;
  isShopOwner: boolean;
  name: string;
  permissions: PermissionNodeArray | null;
  rate: string | null;
  shop: string;
  staffMemberId: string;
  superuser: boolean;
  updatedAt: Date;
}

/** 'UpsertMany' query type */
export interface IUpsertManyQuery {
  params: IUpsertManyParams;
  result: IUpsertManyResult;
}

const upsertManyIR: any = {"usedParamSet":{"shop":true,"employees":true},"params":[{"name":"employees","required":true,"transform":{"type":"pick_array_spread","keys":[{"name":"employeeId","required":true},{"name":"superuser","required":true},{"name":"permissions","required":true},{"name":"rate","required":false},{"name":"isShopOwner","required":true},{"name":"name","required":true}]},"locs":[{"a":183,"b":193}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":41,"b":46}]}],"statement":"WITH Input AS (\n    SELECT \"employeeId\", :shop! AS shop, rate, superuser, permissions, \"isShopOwner\", name\n    FROM (VALUES ('', FALSE, ARRAY[] :: \"PermissionNode\"[], '', FALSE, ''), :employees! OFFSET 1) AS t (\"employeeId\", superuser, permissions, rate, \"isShopOwner\", name)\n)\nINSERT INTO \"Employee\" (\"staffMemberId\", shop, superuser, permissions, rate, \"isShopOwner\", name)\nSELECT \"employeeId\", shop, superuser, permissions, rate, \"isShopOwner\", name\nFROM Input\nON CONFLICT (\"staffMemberId\", \"shop\")\nDO UPDATE SET \"rate\" = EXCLUDED.\"rate\",\n              \"superuser\" = EXCLUDED.\"superuser\",\n              \"permissions\" = EXCLUDED.\"permissions\",\n              \"isShopOwner\" = EXCLUDED.\"isShopOwner\",\n              \"name\" = EXCLUDED.\"name\"\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * WITH Input AS (
 *     SELECT "employeeId", :shop! AS shop, rate, superuser, permissions, "isShopOwner", name
 *     FROM (VALUES ('', FALSE, ARRAY[] :: "PermissionNode"[], '', FALSE, ''), :employees! OFFSET 1) AS t ("employeeId", superuser, permissions, rate, "isShopOwner", name)
 * )
 * INSERT INTO "Employee" ("staffMemberId", shop, superuser, permissions, rate, "isShopOwner", name)
 * SELECT "employeeId", shop, superuser, permissions, rate, "isShopOwner", name
 * FROM Input
 * ON CONFLICT ("staffMemberId", "shop")
 * DO UPDATE SET "rate" = EXCLUDED."rate",
 *               "superuser" = EXCLUDED."superuser",
 *               "permissions" = EXCLUDED."permissions",
 *               "isShopOwner" = EXCLUDED."isShopOwner",
 *               "name" = EXCLUDED."name"
 * RETURNING *
 * ```
 */
export const upsertMany = new PreparedQuery<IUpsertManyParams,IUpsertManyResult>(upsertManyIR);


/** 'DeleteMany' parameters type */
export interface IDeleteManyParams {
  employeeIds: readonly (string)[];
}

/** 'DeleteMany' return type */
export type IDeleteManyResult = void;

/** 'DeleteMany' query type */
export interface IDeleteManyQuery {
  params: IDeleteManyParams;
  result: IDeleteManyResult;
}

const deleteManyIR: any = {"usedParamSet":{"employeeIds":true},"params":[{"name":"employeeIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":48,"b":60}]}],"statement":"DELETE FROM \"Employee\"\nWHERE \"staffMemberId\" IN :employeeIds!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM "Employee"
 * WHERE "staffMemberId" IN :employeeIds!
 * ```
 */
export const deleteMany = new PreparedQuery<IDeleteManyParams,IDeleteManyResult>(deleteManyIR);


