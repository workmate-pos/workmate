/** Types generated for queries found in "services/db/queries/employee.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type PermissionNode = 'read_app_plan' | 'read_employees' | 'read_purchase_orders' | 'read_settings' | 'read_work_orders' | 'write_app_plan' | 'write_employees' | 'write_purchase_orders' | 'write_settings' | 'write_work_orders';

export type PermissionNodeArray = (PermissionNode)[];

export type stringArray = (string)[];

/** 'GetMany' parameters type */
export interface IGetManyParams {
  employeeIds?: stringArray | null | void;
  shop?: string | null | void;
}

/** 'GetMany' return type */
export interface IGetManyResult {
  employeeId: string;
  isShopOwner: boolean;
  name: string;
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

const getManyIR: any = {"usedParamSet":{"shop":true,"employeeIds":true},"params":[{"name":"shop","required":false,"transform":{"type":"scalar"},"locs":[{"a":38,"b":42}]},{"name":"employeeIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":67,"b":78}]}],"statement":"SELECT *\nFROM \"Employee\"\nWHERE shop = :shop\nAND \"employeeId\" = ANY(:employeeIds)"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Employee"
 * WHERE shop = :shop
 * AND "employeeId" = ANY(:employeeIds)
 * ```
 */
export const getMany = new PreparedQuery<IGetManyParams,IGetManyResult>(getManyIR);


/** 'GetPage' parameters type */
export interface IGetPageParams {
  query?: string | null | void;
  shop?: string | null | void;
}

/** 'GetPage' return type */
export interface IGetPageResult {
  employeeId: string;
  isShopOwner: boolean;
  name: string;
  permissions: PermissionNodeArray | null;
  rate: string | null;
  shop: string;
  superuser: boolean;
}

/** 'GetPage' query type */
export interface IGetPageQuery {
  params: IGetPageParams;
  result: IGetPageResult;
}

const getPageIR: any = {"usedParamSet":{"shop":true,"query":true},"params":[{"name":"shop","required":false,"transform":{"type":"scalar"},"locs":[{"a":47,"b":51}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":84,"b":89}]}],"statement":"SELECT *\nFROM \"Employee\"\nWHERE shop = COALESCE(:shop, shop)\nAND name ILIKE COALESCE(:query, '%')"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Employee"
 * WHERE shop = COALESCE(:shop, shop)
 * AND name ILIKE COALESCE(:query, '%')
 * ```
 */
export const getPage = new PreparedQuery<IGetPageParams,IGetPageResult>(getPageIR);


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
  employeeId: string;
  isShopOwner: boolean;
  name: string;
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

const upsertManyIR: any = {"usedParamSet":{"shop":true,"employees":true},"params":[{"name":"employees","required":true,"transform":{"type":"pick_array_spread","keys":[{"name":"employeeId","required":true},{"name":"superuser","required":true},{"name":"permissions","required":true},{"name":"rate","required":false},{"name":"isShopOwner","required":true},{"name":"name","required":true}]},"locs":[{"a":183,"b":193}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":41,"b":46}]}],"statement":"WITH Input AS (\n    SELECT \"employeeId\", :shop! AS shop, rate, superuser, permissions, \"isShopOwner\", name\n    FROM (VALUES ('', FALSE, ARRAY[] :: \"PermissionNode\"[], '', FALSE, ''), :employees! OFFSET 1) AS t (\"employeeId\", superuser, permissions, rate, \"isShopOwner\", name)\n)\nINSERT INTO \"Employee\" (\"employeeId\", shop, superuser, permissions, rate, \"isShopOwner\", name)\nSELECT \"employeeId\", shop, superuser, permissions, rate, \"isShopOwner\", name\nFROM Input\nON CONFLICT (\"employeeId\", \"shop\")\nDO UPDATE SET \"rate\" = EXCLUDED.\"rate\",\n              \"superuser\" = EXCLUDED.\"superuser\",\n              \"permissions\" = EXCLUDED.\"permissions\",\n              \"isShopOwner\" = EXCLUDED.\"isShopOwner\",\n              \"name\" = EXCLUDED.\"name\"\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * WITH Input AS (
 *     SELECT "employeeId", :shop! AS shop, rate, superuser, permissions, "isShopOwner", name
 *     FROM (VALUES ('', FALSE, ARRAY[] :: "PermissionNode"[], '', FALSE, ''), :employees! OFFSET 1) AS t ("employeeId", superuser, permissions, rate, "isShopOwner", name)
 * )
 * INSERT INTO "Employee" ("employeeId", shop, superuser, permissions, rate, "isShopOwner", name)
 * SELECT "employeeId", shop, superuser, permissions, rate, "isShopOwner", name
 * FROM Input
 * ON CONFLICT ("employeeId", "shop")
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


/** 'DoesSuperuserExist' parameters type */
export interface IDoesSuperuserExistParams {
  shop: string;
}

/** 'DoesSuperuserExist' return type */
export interface IDoesSuperuserExistResult {
  exists: boolean | null;
}

/** 'DoesSuperuserExist' query type */
export interface IDoesSuperuserExistQuery {
  params: IDoesSuperuserExistParams;
  result: IDoesSuperuserExistResult;
}

const doesSuperuserExistIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":60,"b":65}]}],"statement":"SELECT EXISTS (\n  SELECT 1\n  FROM \"Employee\"\n  WHERE shop = :shop!\n  AND superuser = TRUE\n) AS \"exists\""};

/**
 * Query generated from SQL:
 * ```
 * SELECT EXISTS (
 *   SELECT 1
 *   FROM "Employee"
 *   WHERE shop = :shop!
 *   AND superuser = TRUE
 * ) AS "exists"
 * ```
 */
export const doesSuperuserExist = new PreparedQuery<IDoesSuperuserExistParams,IDoesSuperuserExistResult>(doesSuperuserExistIR);


