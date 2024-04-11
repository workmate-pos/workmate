/** Types generated for queries found in "services/db/queries/employee.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type PermissionNode = 'cycle_count' | 'read_app_plan' | 'read_employees' | 'read_purchase_orders' | 'read_settings' | 'read_work_orders' | 'write_app_plan' | 'write_employees' | 'write_purchase_orders' | 'write_settings' | 'write_work_orders';

export type PermissionNodeArray = (PermissionNode)[];

export type stringArray = (string)[];

/** 'GetMany' parameters type */
export interface IGetManyParams {
  employeeIds?: stringArray | null | void;
  shop?: string | null | void;
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

const getManyIR: any = {"usedParamSet":{"employeeIds":true,"shop":true},"params":[{"name":"employeeIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":53,"b":64}]},{"name":"shop","required":false,"transform":{"type":"scalar"},"locs":[{"a":87,"b":91}]}],"statement":"SELECT *\nFROM \"Employee\"\nWHERE \"staffMemberId\" = ANY(:employeeIds)\nAND shop = COALESCE(:shop, shop)"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Employee"
 * WHERE "staffMemberId" = ANY(:employeeIds)
 * AND shop = COALESCE(:shop, shop)
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

/** 'GetPage' query type */
export interface IGetPageQuery {
  params: IGetPageParams;
  result: IGetPageResult;
}

const getPageIR: any = {"usedParamSet":{"shop":true,"query":true},"params":[{"name":"shop","required":false,"transform":{"type":"scalar"},"locs":[{"a":47,"b":51}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":86,"b":91}]}],"statement":"SELECT *\nFROM \"Employee\"\nWHERE shop = COALESCE(:shop, shop)\n  AND name ILIKE COALESCE(:query, '%')"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Employee"
 * WHERE shop = COALESCE(:shop, shop)
 *   AND name ILIKE COALESCE(:query, '%')
 * ```
 */
export const getPage = new PreparedQuery<IGetPageParams,IGetPageResult>(getPageIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  isShopOwner: boolean;
  name: string;
  permissions: PermissionNodeArray;
  rate?: string | null | void;
  shop: string;
  staffMemberId: string;
  superuser: boolean;
}

/** 'Upsert' return type */
export interface IUpsertResult {
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

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"shop":true,"superuser":true,"permissions":true,"rate":true,"name":true,"isShopOwner":true,"staffMemberId":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":111},{"a":253,"b":258}]},{"name":"superuser","required":true,"transform":{"type":"scalar"},"locs":[{"a":114,"b":124},{"a":283,"b":293}]},{"name":"permissions","required":true,"transform":{"type":"scalar"},"locs":[{"a":127,"b":139},{"a":318,"b":330}]},{"name":"rate","required":false,"transform":{"type":"scalar"},"locs":[{"a":142,"b":146},{"a":355,"b":359}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":149,"b":154},{"a":384,"b":389}]},{"name":"isShopOwner","required":true,"transform":{"type":"scalar"},"locs":[{"a":157,"b":169},{"a":414,"b":426}]},{"name":"staffMemberId","required":true,"transform":{"type":"scalar"},"locs":[{"a":172,"b":186}]}],"statement":"INSERT INTO \"Employee\" (shop, superuser, permissions, rate, name, \"isShopOwner\", \"staffMemberId\")\nVALUES (:shop!, :superuser!, :permissions!, :rate, :name!, :isShopOwner!, :staffMemberId!)\nON CONFLICT (\"staffMemberId\")\n  DO UPDATE\n  SET shop          = :shop!,\n      superuser     = :superuser!,\n      permissions   = :permissions!,\n      rate          = :rate,\n      name          = :name!,\n      \"isShopOwner\" = :isShopOwner!\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "Employee" (shop, superuser, permissions, rate, name, "isShopOwner", "staffMemberId")
 * VALUES (:shop!, :superuser!, :permissions!, :rate, :name!, :isShopOwner!, :staffMemberId!)
 * ON CONFLICT ("staffMemberId")
 *   DO UPDATE
 *   SET shop          = :shop!,
 *       superuser     = :superuser!,
 *       permissions   = :permissions!,
 *       rate          = :rate,
 *       name          = :name!,
 *       "isShopOwner" = :isShopOwner!
 * RETURNING *
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


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

const deleteManyIR: any = {"usedParamSet":{"employeeIds":true},"params":[{"name":"employeeIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":48,"b":60}]}],"statement":"DELETE\nFROM \"Employee\"\nWHERE \"staffMemberId\" IN :employeeIds!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "Employee"
 * WHERE "staffMemberId" IN :employeeIds!
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


