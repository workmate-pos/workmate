/** Types generated for queries found in "services/db/queries/employee-rate.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetMany' parameters type */
export interface IGetManyParams {
  employeeIds: readonly (string)[];
  shop: string;
}

/** 'GetMany' return type */
export interface IGetManyResult {
  employeeId: string;
  rate: string;
  shop: string;
}

/** 'GetMany' query type */
export interface IGetManyQuery {
  params: IGetManyParams;
  result: IGetManyResult;
}

const getManyIR: any = {"usedParamSet":{"shop":true,"employeeIds":true},"params":[{"name":"employeeIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":69,"b":81}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":42,"b":47}]}],"statement":"SELECT *\nFROM \"EmployeeRate\"\nWHERE shop = :shop!\nAND \"employeeId\" IN :employeeIds!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "EmployeeRate"
 * WHERE shop = :shop!
 * AND "employeeId" IN :employeeIds!
 * ```
 */
export const getMany = new PreparedQuery<IGetManyParams,IGetManyResult>(getManyIR);


/** 'UpsertMany' parameters type */
export interface IUpsertManyParams {
  rates: readonly ({
    employeeId: string,
    rate: string
  })[];
  shop: string;
}

/** 'UpsertMany' return type */
export type IUpsertManyResult = void;

/** 'UpsertMany' query type */
export interface IUpsertManyQuery {
  params: IUpsertManyParams;
  result: IUpsertManyResult;
}

const upsertManyIR: any = {"usedParamSet":{"shop":true,"rates":true},"params":[{"name":"rates","required":true,"transform":{"type":"pick_array_spread","keys":[{"name":"employeeId","required":true},{"name":"rate","required":true}]},"locs":[{"a":89,"b":95}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":41,"b":46}]}],"statement":"WITH Input AS (\n    SELECT \"employeeId\", :shop! AS shop, rate\n    FROM (VALUES ('', ''), :rates! OFFSET 1) AS t (\"employeeId\", rate)\n)\nINSERT INTO \"EmployeeRate\" (\"employeeId\", \"shop\", \"rate\")\nSELECT \"employeeId\", shop, rate\nFROM Input\nON CONFLICT (\"employeeId\", \"shop\")\nDO UPDATE SET \"rate\" = EXCLUDED.\"rate\""};

/**
 * Query generated from SQL:
 * ```
 * WITH Input AS (
 *     SELECT "employeeId", :shop! AS shop, rate
 *     FROM (VALUES ('', ''), :rates! OFFSET 1) AS t ("employeeId", rate)
 * )
 * INSERT INTO "EmployeeRate" ("employeeId", "shop", "rate")
 * SELECT "employeeId", shop, rate
 * FROM Input
 * ON CONFLICT ("employeeId", "shop")
 * DO UPDATE SET "rate" = EXCLUDED."rate"
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

const deleteManyIR: any = {"usedParamSet":{"shop":true,"employeeIds":true},"params":[{"name":"employeeIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":67,"b":79}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":40,"b":45}]}],"statement":"DELETE FROM \"EmployeeRate\"\nWHERE shop = :shop!\nAND \"employeeId\" IN :employeeIds!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM "EmployeeRate"
 * WHERE shop = :shop!
 * AND "employeeId" IN :employeeIds!
 * ```
 */
export const deleteMany = new PreparedQuery<IDeleteManyParams,IDeleteManyResult>(deleteManyIR);


