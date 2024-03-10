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
export type IUpsertResult = void;

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"shop":true,"superuser":true,"permissions":true,"rate":true,"name":true,"isShopOwner":true,"staffMemberId":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":111},{"a":253,"b":258}]},{"name":"superuser","required":true,"transform":{"type":"scalar"},"locs":[{"a":114,"b":124},{"a":283,"b":293}]},{"name":"permissions","required":true,"transform":{"type":"scalar"},"locs":[{"a":127,"b":139},{"a":318,"b":330}]},{"name":"rate","required":false,"transform":{"type":"scalar"},"locs":[{"a":142,"b":146},{"a":355,"b":359}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":149,"b":154},{"a":384,"b":389}]},{"name":"isShopOwner","required":true,"transform":{"type":"scalar"},"locs":[{"a":157,"b":169},{"a":414,"b":426}]},{"name":"staffMemberId","required":true,"transform":{"type":"scalar"},"locs":[{"a":172,"b":186}]}],"statement":"INSERT INTO \"Employee\" (shop, superuser, permissions, rate, name, \"isShopOwner\", \"staffMemberId\")\nVALUES (:shop!, :superuser!, :permissions!, :rate, :name!, :isShopOwner!, :staffMemberId!)\nON CONFLICT (\"staffMemberId\")\n  DO UPDATE\n  SET shop          = :shop!,\n      superuser     = :superuser!,\n      permissions   = :permissions!,\n      rate          = :rate,\n      name          = :name!,\n      \"isShopOwner\" = :isShopOwner!"};

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


