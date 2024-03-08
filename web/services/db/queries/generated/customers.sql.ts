/** Types generated for queries found in "services/db/queries/customers.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'Get' parameters type */
export interface IGetParams {
  customerId: string;
}

/** 'Get' return type */
export interface IGetResult {
  createdAt: Date;
  customerId: string;
  deletedAt: Date | null;
  displayName: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  shop: string;
  updatedAt: Date;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"customerId":true},"params":[{"name":"customerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":46,"b":57}]}],"statement":"SELECT *\nFROM \"Customer\"\nWHERE \"customerId\" = :customerId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Customer"
 * WHERE "customerId" = :customerId!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'GetMany' parameters type */
export interface IGetManyParams {
  customerIds: readonly (string)[];
}

/** 'GetMany' return type */
export interface IGetManyResult {
  createdAt: Date;
  customerId: string;
  deletedAt: Date | null;
  displayName: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  shop: string;
  updatedAt: Date;
}

/** 'GetMany' query type */
export interface IGetManyQuery {
  params: IGetManyParams;
  result: IGetManyResult;
}

const getManyIR: any = {"usedParamSet":{"customerIds":true},"params":[{"name":"customerIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":47,"b":59}]}],"statement":"SELECT *\nFROM \"Customer\"\nWHERE \"customerId\" IN :customerIds!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Customer"
 * WHERE "customerId" IN :customerIds!
 * ```
 */
export const getMany = new PreparedQuery<IGetManyParams,IGetManyResult>(getManyIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  customerId: string;
  displayName: string;
  email?: string | null | void;
  firstName?: string | null | void;
  lastName?: string | null | void;
  phone?: string | null | void;
  shop: string;
}

/** 'Upsert' return type */
export type IUpsertResult = void;

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"customerId":true,"shop":true,"displayName":true,"firstName":true,"lastName":true,"email":true,"phone":true},"params":[{"name":"customerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":117}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":120,"b":125},{"a":241,"b":246}]},{"name":"displayName","required":true,"transform":{"type":"scalar"},"locs":[{"a":128,"b":140},{"a":271,"b":283}]},{"name":"firstName","required":false,"transform":{"type":"scalar"},"locs":[{"a":143,"b":152},{"a":308,"b":317}]},{"name":"lastName","required":false,"transform":{"type":"scalar"},"locs":[{"a":155,"b":163},{"a":342,"b":350}]},{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":166,"b":171},{"a":375,"b":380}]},{"name":"phone","required":false,"transform":{"type":"scalar"},"locs":[{"a":174,"b":179},{"a":405,"b":410}]}],"statement":"INSERT INTO \"Customer\" (\"customerId\", shop, \"displayName\", \"firstName\", \"lastName\", email, phone)\nVALUES (:customerId!, :shop!, :displayName!, :firstName, :lastName, :email, :phone)\nON CONFLICT (\"customerId\") DO UPDATE\n  SET shop          = :shop!,\n      \"displayName\" = :displayName!,\n      \"firstName\"   = :firstName,\n      \"lastName\"    = :lastName,\n      email         = :email,\n      phone         = :phone"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "Customer" ("customerId", shop, "displayName", "firstName", "lastName", email, phone)
 * VALUES (:customerId!, :shop!, :displayName!, :firstName, :lastName, :email, :phone)
 * ON CONFLICT ("customerId") DO UPDATE
 *   SET shop          = :shop!,
 *       "displayName" = :displayName!,
 *       "firstName"   = :firstName,
 *       "lastName"    = :lastName,
 *       email         = :email,
 *       phone         = :phone
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'SoftDeleteCustomers' parameters type */
export interface ISoftDeleteCustomersParams {
  customerIds: readonly (string)[];
}

/** 'SoftDeleteCustomers' return type */
export type ISoftDeleteCustomersResult = void;

/** 'SoftDeleteCustomers' query type */
export interface ISoftDeleteCustomersQuery {
  params: ISoftDeleteCustomersParams;
  result: ISoftDeleteCustomersResult;
}

const softDeleteCustomersIR: any = {"usedParamSet":{"customerIds":true},"params":[{"name":"customerIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":64,"b":76}]}],"statement":"UPDATE \"Customer\"\nSET \"deletedAt\" = NOW()\nWHERE \"customerId\" IN :customerIds!\nAND \"deletedAt\" IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "Customer"
 * SET "deletedAt" = NOW()
 * WHERE "customerId" IN :customerIds!
 * AND "deletedAt" IS NULL
 * ```
 */
export const softDeleteCustomers = new PreparedQuery<ISoftDeleteCustomersParams,ISoftDeleteCustomersResult>(softDeleteCustomersIR);


